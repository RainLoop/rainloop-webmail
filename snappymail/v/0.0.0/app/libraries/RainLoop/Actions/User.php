<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Exceptions\ClientException;
use RainLoop\Notifications;
use RainLoop\Providers\Suggestions;
use RainLoop\Utils;

trait User
{
	use Accounts;
	use Contacts;
	use Filters;
	use Folders;
	use Messages;
	use Attachments;
	use Pgp;
	use SMime;

	private ?Suggestions $oSuggestionsProvider = null;

	public function SuggestionsProvider(): Suggestions
	{
		if (null === $this->oSuggestionsProvider) {
			$this->oSuggestionsProvider = new Suggestions($this->fabrica('suggestions'));
		}

		return $this->oSuggestionsProvider;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoLogin() : array
	{
		$sEmail = \MailSo\Base\Utils::Trim($this->GetActionParam('Email', ''));
		$sPassword = $this->GetActionParam('Password', '');

		try {
			$oAccount = $this->LoginProcess($sEmail, $sPassword);
		} catch (\Throwable $oException) {
			$this->loginErrorDelay();
			throw $oException;
		}

		// Must be here due to bug #1241
		$this->SetMainAuthAccount($oAccount);
		$this->Plugins()->RunHook('login.success', array($oAccount));

		$this->SetAuthToken($oAccount);
		empty($this->GetActionParam('signMe', 0)) || $this->SetSignMeToken($oAccount);

		$sLanguage = $this->GetActionParam('language', '');
		if ($oAccount && $sLanguage) {
			$oSettings = $this->SettingsProvider()->Load($oAccount);
			if ($oSettings) {
				$sLanguage = $this->ValidateLanguage($sLanguage);
				$sCurrentLanguage = $oSettings->GetConf('language', '');

				if ($sCurrentLanguage !== $sLanguage) {
					$oSettings->SetConf('language', $sLanguage);
					$this->SettingsProvider()->Save($oAccount, $oSettings);
				}
			}
		}

		return $this->DefaultResponse($this->AppData(false));
	}

	public function DoLogout() : array
	{
		$bMain = true; // empty($_COOKIE[self::AUTH_ADDITIONAL_TOKEN_KEY]);
		$this->Logout($bMain);
		$bMain && $this->ClearSignMeData();
		return $this->TrueResponse();
	}

	public function DoAppDelayStart() : array
	{
		$this->Plugins()->RunHook('service.app-delay-start-begin');

		Utils::UpdateConnectionToken();

		$bMainCache = false;
		$bFilesCache = false;

		$iOneDay1 = 3600 * 23;
		$iOneDay2 = 3600 * 25;

		$sTimers = $this->StorageProvider()->Get(null,
			\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers', '');

		$aTimers = \explode(',', $sTimers);

		$iMainCacheTime = !empty($aTimers[0]) && \is_numeric($aTimers[0]) ? (int) $aTimers[0] : 0;
		$iFilesCacheTime = !empty($aTimers[1]) && \is_numeric($aTimers[1]) ? (int) $aTimers[1] : 0;

		if (0 === $iMainCacheTime || $iMainCacheTime + $iOneDay1 < \time()) {
			$bMainCache = true;
			$iMainCacheTime = \time();
		}

		if (0 === $iFilesCacheTime || $iFilesCacheTime + $iOneDay2 < \time()) {
			$bFilesCache = true;
			$iFilesCacheTime = \time();
		}

		if ($bMainCache || $bFilesCache) {
			if (!$this->StorageProvider()->Put(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers',
				\implode(',', array($iMainCacheTime, $iFilesCacheTime))))
			{
				$bMainCache = $bFilesCache = false;
			}
		}

		if ($bMainCache) {
			$this->logWrite('Cacher GC: Begin');
			$this->Cacher()->GC(48);
			$this->logWrite('Cacher GC: End');

			$this->logWrite('Storage GC: Begin');
			$this->StorageProvider()->GC();
			$this->logWrite('Storage GC: End');
		} else if ($bFilesCache) {
			$this->logWrite('Files GC: Begin');
			$this->FilesProvider()->GC(48);
			$this->logWrite('Files GC: End');
		}

		$this->Plugins()->RunHook('service.app-delay-start-end');

		return $this->TrueResponse();
	}

	public function DoSettingsUpdate() : array
	{
		$oAccount = $this->getAccountFromToken();

		$self = $this;
		$oConfig = $this->Config();

		$oSettings = $this->SettingsProvider()->Load($oAccount);
		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

		if ($oConfig->Get('webmail', 'allow_languages_on_settings', true)) {
			$this->setSettingsFromParams($oSettings, 'language', 'string', function ($sLanguage) use ($self) {
				return $self->ValidateLanguage($sLanguage);
			});
		} else {
//			$oSettings->SetConf('language', $this->ValidateLanguage($oConfig->Get('webmail', 'language', 'en')));
		}
		$this->setSettingsFromParams($oSettings, 'hourCycle', 'string');

		if ($this->GetCapa(Capa::THEMES)) {
			$this->setSettingsFromParams($oSettingsLocal, 'Theme', 'string', function ($sTheme) use ($self) {
				return $self->ValidateTheme($sTheme);
			});
			$this->setSettingsFromParams($oSettings, 'fontSansSerif', 'string');
			$this->setSettingsFromParams($oSettings, 'fontSerif', 'string');
			$this->setSettingsFromParams($oSettings, 'fontMono', 'string');
		} else {
//			$oSettingsLocal->SetConf('Theme', $this->ValidateTheme($oConfig->Get('webmail', 'theme', 'Default')));
		}

		$this->setSettingsFromParams($oSettings, 'MessagesPerPage', 'int', function ($iValue) {
			return \min(50, \max(10, $iValue));
		});

		$this->setSettingsFromParams($oSettings, 'Layout', 'int', function ($iValue) {
			return (int) (\in_array((int) $iValue, array(\RainLoop\Enumerations\Layout::NO_PREVIEW,
				\RainLoop\Enumerations\Layout::SIDE_PREVIEW, \RainLoop\Enumerations\Layout::BOTTOM_PREVIEW)) ?
					$iValue : \RainLoop\Enumerations\Layout::SIDE_PREVIEW);
		});

		$this->setSettingsFromParams($oSettings, 'EditorDefaultType', 'string');
		$this->setSettingsFromParams($oSettings, 'editorWysiwyg', 'string');
		$this->setSettingsFromParams($oSettings, 'requestReadReceipt', 'bool');
		$this->setSettingsFromParams($oSettings, 'requestDsn', 'bool');
		$this->setSettingsFromParams($oSettings, 'requireTLS', 'bool');
		$this->setSettingsFromParams($oSettings, 'pgpSign', 'bool');
		$this->setSettingsFromParams($oSettings, 'pgpEncrypt', 'bool');
		$this->setSettingsFromParams($oSettings, 'allowSpellcheck', 'bool');

		$this->setSettingsFromParams($oSettings, 'ViewHTML', 'bool');
		$this->setSettingsFromParams($oSettings, 'ViewImages', 'string');
		$this->setSettingsFromParams($oSettings, 'ViewImagesWhitelist', 'string');
		$this->setSettingsFromParams($oSettings, 'RemoveColors', 'bool');
		$this->setSettingsFromParams($oSettings, 'AllowStyles', 'bool');
		$this->setSettingsFromParams($oSettings, 'ListInlineAttachments', 'bool');
		$this->setSettingsFromParams($oSettings, 'CollapseBlockquotes', 'bool');
		$this->setSettingsFromParams($oSettings, 'MaxBlockquotesLevel', 'int');
		$this->setSettingsFromParams($oSettings, 'simpleAttachmentsList', 'bool');
		$this->setSettingsFromParams($oSettings, 'listGrouped', 'bool');
		$this->setSettingsFromParams($oSettings, 'ContactsAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'DesktopNotifications', 'bool');
		$this->setSettingsFromParams($oSettings, 'SoundNotification', 'bool');
		$this->setSettingsFromParams($oSettings, 'NotificationSound', 'string');
		$this->setSettingsFromParams($oSettings, 'UseCheckboxesInList', 'bool');
		$this->setSettingsFromParams($oSettings, 'AllowDraftAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'AutoLogout', 'int');
		$this->setSettingsFromParams($oSettings, 'messageNewWindow', 'bool');
		$this->setSettingsFromParams($oSettings, 'messageReadAuto', 'bool');
		$this->setSettingsFromParams($oSettings, 'MessageReadDelay', 'int');
		$this->setSettingsFromParams($oSettings, 'MsgDefaultAction', 'int');
		$this->setSettingsFromParams($oSettings, 'showNextMessage', 'bool');

		$this->setSettingsFromParams($oSettings, 'Resizer4Width', 'int');
		$this->setSettingsFromParams($oSettings, 'Resizer5Width', 'int');
		$this->setSettingsFromParams($oSettings, 'Resizer5Height', 'int');

		$this->setSettingsFromParams($oSettingsLocal, 'UseThreads', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'ReplySameFolder', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'HideUnsubscribed', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'HideDeleted', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'UnhideKolabFolders', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'ShowUnreadCount', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'CheckMailInterval', 'int');

		return $this->DefaultResponse($this->SettingsProvider()->Save($oAccount, $oSettings) &&
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	public function DoQuota() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(Capa::QUOTA)) {
			return $this->DefaultResponse(array(0, 0, 0, 0));
		}

		try
		{
			$aQuota = $this->ImapClient()->QuotaRoot();
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse($aQuota);
	}

	public function DoSuggestions() : array
	{
		$oAccount = $this->getAccountFromToken();

		$sQuery = \trim($this->GetActionParam('Query', ''));
		$iLimit = (int) $this->Config()->Get('contacts', 'suggestions_limit', 20);

		$this->Plugins()->RunHook('json.suggestions-input-parameters', array(&$sQuery, &$iLimit, $oAccount));

		$aResult = array();

		if ($oSuggestionsProvider = $this->SuggestionsProvider()) {
			$aResult = $oSuggestionsProvider->Process($oAccount, $sQuery, $iLimit);
		}

		return $this->DefaultResponse($aResult);
	}

	public function DoClearUserBackground() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(Capa::USER_BACKGROUND)) {
			return $this->FalseResponse();
		}

		$oSettings = $this->SettingsProvider()->Load($oAccount);
		if ($oAccount && $oSettings) {
			$this->StorageProvider()->Clear($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'background'
			);

			$oSettings->SetConf('UserBackgroundName', '');
			$oSettings->SetConf('UserBackgroundHash', '');
		}

		return $this->DefaultResponse($oAccount && $oSettings ?
			$this->SettingsProvider()->Save($oAccount, $oSettings) : false);
	}

	private function setSettingsFromParams(\RainLoop\Settings $oSettings, string $sConfigName, string $sType = 'string', ?callable $cCallback = null) : void
	{
		if ($this->HasActionParam($sConfigName)) {
			$sValue = $this->GetActionParam($sConfigName, '');
			switch ($sType)
			{
				default:
				case 'string':
					$sValue = (string) $sValue;
					if ($cCallback) {
						$sValue = $cCallback($sValue);
					}
					$oSettings->SetConf($sConfigName, (string) $sValue);
					break;

				case 'int':
					$iValue = (int) $sValue;
					if ($cCallback) {
						$sValue = $cCallback($iValue);
					}
					$oSettings->SetConf($sConfigName, $iValue);
					break;

				case 'bool':
					$oSettings->SetConf($sConfigName, !empty($sValue) && 'false' !== $sValue);
					break;
			}
		}
	}
}
