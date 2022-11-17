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
	use Pgp;

	/**
	 * @var \RainLoop\Providers\Suggestions
	 */
	private $oSuggestionsProvider = null;

	public function SuggestionsProvider(): Suggestions
	{
		if (null === $this->oSuggestionsProvider) {
			$this->oSuggestionsProvider = new Suggestions(
				$this->fabrica('suggestions'));
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
		$bSignMe = !empty($this->GetActionParam('SignMe', 0));

		$this->Logger()->AddSecret($sPassword);

		$oAccount = $this->LoginProcess($sEmail, $sPassword, $bSignMe);
		$this->Plugins()->RunHook('login.success', array($oAccount));

		$this->SetAuthToken($oAccount);

		$sLanguage = $this->GetActionParam('Language', '');
		if ($oAccount && $sLanguage)
		{
			$oSettings = $this->SettingsProvider()->Load($oAccount);
			if ($oSettings)
			{
				$sLanguage = $this->ValidateLanguage($sLanguage);
				$sCurrentLanguage = $oSettings->GetConf('Language', '');

				if ($sCurrentLanguage !== $sLanguage)
				{
					$oSettings->SetConf('Language', $sLanguage);
					$this->SettingsProvider()->Save($oAccount, $oSettings);
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $this->AppData(false));
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoAttachmentsActions() : array
	{
		$sAction = $this->GetActionParam('Do', '');
		$aHashes = $this->GetActionParam('Hashes', null);
		$oFilesProvider = $this->FilesProvider();
		if (empty($sAction) || !$this->GetCapa(Capa::ATTACHMENTS_ACTIONS) || !$oFilesProvider || !$oFilesProvider->IsActive()) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->initMailClientConnection();

		$bError = false;
		$aData = [];
		$mUIDs = [];

		if (\is_array($aHashes) && \count($aHashes)) {
			foreach ($aHashes as $sZipHash) {
				$aResult = $this->getMimeFileByHash($oAccount, $sZipHash);
				if (empty($aResult['FileHash'])) {
					$bError = true;
					break;
				}
				$aData[] = $aResult;
				$mUIDs[$aResult['Uid']] = $aResult['Uid'];
			}
		}
		$mUIDs = 1 < \count($mUIDs);

		if ($bError || !\count($aData)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$mResult = false;
		switch (\strtolower($sAction))
		{
			case 'zip':

				$sZipHash = \MailSo\Base\Utils::Sha1Rand();
				$sZipFileName = $oFilesProvider->GenerateLocalFullFileName($oAccount, $sZipHash);

				if (!empty($sZipFileName)) {
					if (\class_exists('ZipArchive')) {
						$oZip = new \ZipArchive();
						$oZip->open($sZipFileName, \ZIPARCHIVE::CREATE | \ZIPARCHIVE::OVERWRITE);
						$oZip->setArchiveComment('SnappyMail/'.APP_VERSION);
						foreach ($aData as $aItem) {
							$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $aItem['FileHash']);
							$sFileName = ($mUIDs ? "{$aItem['Uid']}/" : '') . ($aItem['FileName'] ?: 'file.dat');
							if (!$oZip->addFile($sFullFileNameHash, $sFileName)) {
								$bError = true;
							}
						}

						if ($bError) {
							$oZip->close();
						} else {
							$bError = !$oZip->close();
						}
/*
					} else {
						@\unlink($sZipFileName);
						$oZip = new \SnappyMail\Stream\ZIP($sZipFileName);
//						$oZip->setArchiveComment('SnappyMail/'.APP_VERSION);
						foreach ($aData as $aItem) {
							$sFileName = (string) (isset($aItem['FileName']) ? $aItem['FileName'] : 'file.dat');
							$sFileHash = (string) (isset($aItem['FileHash']) ? $aItem['FileHash'] : '');
							if (!empty($sFileHash)) {
								$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $sFileHash);
								if (!$oZip->addFile($sFullFileNameHash, $sFileName)) {
									$bError = true;
								}
							}
						}
						$oZip->close();
*/
					} else {
						@\unlink($sZipFileName);
						$oZip = new \PharData($sZipFileName . '.zip', 0, null, \Phar::ZIP);
						$oZip->compressFiles(\Phar::GZ);
						foreach ($aData as $aItem) {
							$oZip->addFile(
								$oFilesProvider->GetFileName($oAccount, $aItem['FileHash']),
								($mUIDs ? "{$aItem['Uid']}/" : '') . ($aItem['FileName'] ?: 'file.dat')
							);
						}
						$oZip->compressFiles(\Phar::GZ);
						unset($oZip);
						\rename($sZipFileName . '.zip', $sZipFileName);
					}

					foreach ($aData as $aItem) {
						$oFilesProvider->Clear($oAccount, $aItem['FileHash']);
					}

					if (!$bError) {
						$mResult = array(
							'FileHash' => Utils::EncodeKeyValuesQ(array(
								'Account' => $oAccount ? $oAccount->Hash() : '',
								'FileName' => 'attachments.zip',
								'MimeType' => 'application/zip',
								'FileHash' => $sZipHash
							))
						);
					}
				}
				break;

			default:
				$data = new \SnappyMail\AttachmentsAction;
				$data->action = $sAction;
				$data->items = $aData;
				$data->filesProvider = $oFilesProvider;
				$data->account = $oAccount;
				$this->Plugins()->RunHook('json.attachments', array($data));
				$mResult = $data->result;
				break;
		}

//		$this->requestSleep();
		return $this->DefaultResponse(__FUNCTION__, $bError ? false : $mResult);
	}

	public function DoLogout() : array
	{
		$bMain = true; // empty($_COOKIE[self::AUTH_ADDITIONAL_TOKEN_KEY]);
		$this->Logout($bMain);
		$bMain && $this->ClearSignMeData();
		return $this->TrueResponse(__FUNCTION__);
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

		if (0 === $iMainCacheTime || $iMainCacheTime + $iOneDay1 < \time())
		{
			$bMainCache = true;
			$iMainCacheTime = \time();
		}

		if (0 === $iFilesCacheTime || $iFilesCacheTime + $iOneDay2 < \time())
		{
			$bFilesCache = true;
			$iFilesCacheTime = \time();
		}

		if ($bMainCache || $bFilesCache)
		{
			if (!$this->StorageProvider()->Put(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers',
				\implode(',', array($iMainCacheTime, $iFilesCacheTime))))
			{
				$bMainCache = $bFilesCache = false;
			}
		}

		if ($bMainCache)
		{
			$this->Logger()->Write('Cacher GC: Begin');
			$this->Cacher()->GC(48);
			$this->Logger()->Write('Cacher GC: End');

			$this->Logger()->Write('Storage GC: Begin');
			$this->StorageProvider()->GC();
			$this->Logger()->Write('Storage GC: End');
		}
		else if ($bFilesCache)
		{
			$this->Logger()->Write('Files GC: Begin');
			$this->FilesProvider()->GC(48);
			$this->Logger()->Write('Files GC: End');
		}

		$this->Plugins()->RunHook('service.app-delay-start-end');

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoSettingsUpdate() : array
	{
		$oAccount = $this->getAccountFromToken();

		$self = $this;
		$oConfig = $this->Config();

		$oSettings = $this->SettingsProvider()->Load($oAccount);
		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

		if ($oConfig->Get('webmail', 'allow_languages_on_settings', true))
		{
			$this->setSettingsFromParams($oSettings, 'Language', 'string', function ($sLanguage) use ($self) {
				return $self->ValidateLanguage($sLanguage);
			});
		}
		else
		{
//			$oSettings->SetConf('Language', $this->ValidateLanguage($oConfig->Get('webmail', 'language', 'en')));
		}

		if ($this->GetCapa(Capa::THEMES))
		{
			$this->setSettingsFromParams($oSettingsLocal, 'Theme', 'string', function ($sTheme) use ($self) {
				return $self->ValidateTheme($sTheme);
			});
			$this->setSettingsFromParams($oSettings, 'fontSansSerif', 'string');
			$this->setSettingsFromParams($oSettings, 'fontSerif', 'string');
			$this->setSettingsFromParams($oSettings, 'fontMono', 'string');
		}
		else
		{
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
		$this->setSettingsFromParams($oSettings, 'requestReadReceipt', 'bool');
		$this->setSettingsFromParams($oSettings, 'requestDsn', 'bool');
		$this->setSettingsFromParams($oSettings, 'pgpSign', 'bool');
		$this->setSettingsFromParams($oSettings, 'pgpEncrypt', 'bool');
		$this->setSettingsFromParams($oSettings, 'allowSpellcheck', 'bool');

		$this->setSettingsFromParams($oSettings, 'ViewHTML', 'bool');
		$this->setSettingsFromParams($oSettings, 'ShowImages', 'bool');
		$this->setSettingsFromParams($oSettings, 'RemoveColors', 'bool');
		$this->setSettingsFromParams($oSettings, 'ListInlineAttachments', 'bool');
		$this->setSettingsFromParams($oSettings, 'simpleAttachmentsList', 'bool');
		$this->setSettingsFromParams($oSettings, 'ContactsAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'DesktopNotifications', 'bool');
		$this->setSettingsFromParams($oSettings, 'SoundNotification', 'bool');
		$this->setSettingsFromParams($oSettings, 'NotificationSound', 'string');
		$this->setSettingsFromParams($oSettings, 'UseCheckboxesInList', 'bool');
		$this->setSettingsFromParams($oSettings, 'AllowDraftAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'AutoLogout', 'int');
		$this->setSettingsFromParams($oSettings, 'MessageReadDelay', 'int');
		$this->setSettingsFromParams($oSettings, 'MsgDefaultAction', 'int');

		$this->setSettingsFromParams($oSettings, 'Resizer4Width', 'int');
		$this->setSettingsFromParams($oSettings, 'Resizer5Width', 'int');
		$this->setSettingsFromParams($oSettings, 'Resizer5Height', 'int');

		$this->setSettingsFromParams($oSettingsLocal, 'UseThreads', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'ReplySameFolder', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'HideUnsubscribed', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'HideDeleted', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'UnhideKolabFolders', 'bool');

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider()->Save($oAccount, $oSettings) &&
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	public function DoQuota() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(Capa::QUOTA))
		{
			return $this->DefaultResponse(__FUNCTION__, array(0, 0, 0, 0));
		}

		try
		{
			$aQuota = $this->MailClient()->QuotaRoot();
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__, $aQuota);
	}

	public function DoSuggestions() : array
	{
		$oAccount = $this->getAccountFromToken();

		$sQuery = \trim($this->GetActionParam('Query', ''));
		$iLimit = (int) $this->Config()->Get('contacts', 'suggestions_limit', 20);

		$aResult = array();

		$this->Plugins()->RunHook('json.suggestions-input-parameters', array(&$sQuery, &$iLimit, $oAccount));

		$iLimit = (int) $iLimit;
		if (5 > $iLimit)
		{
			$iLimit = 5;
		}

		$this->Plugins()->RunHook('json.suggestions-pre', array(&$aResult, $sQuery, $oAccount, $iLimit));

		if ($iLimit > \count($aResult) && \strlen($sQuery))
		{
			try
			{
				// Address Book
				$oAddressBookProvider = $this->AddressBookProvider($oAccount);
				if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
				{
					$aSuggestions = $oAddressBookProvider->GetSuggestions($sQuery, $iLimit);
					if (!\count($aResult))
					{
						$aResult = $aSuggestions;
					}
					else
					{
						$aResult = \array_merge($aResult, $aSuggestions);
					}
				}
			}
			catch (\Throwable $oException)
			{
				$this->Logger()->WriteException($oException);
			}
		}

		if ($iLimit > \count($aResult) && \strlen($sQuery))
		{
			$oSuggestionsProvider = $this->SuggestionsProvider();
			if ($oSuggestionsProvider && $oSuggestionsProvider->IsActive())
			{
				$aSuggestionsProviderResult = $oSuggestionsProvider->Process($oAccount, $sQuery, $iLimit);
				if (\is_array($aSuggestionsProviderResult) && \count($aSuggestionsProviderResult))
				{
					$aResult = \array_merge($aResult, $aSuggestionsProviderResult);
				}
			}

		}

		$aResult = Utils::RemoveSuggestionDuplicates($aResult);
		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		$this->Plugins()->RunHook('json.suggestions-post', array(&$aResult, $sQuery, $oAccount, $iLimit));

		$aResult = Utils::RemoveSuggestionDuplicates($aResult);
		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	public function DoClearUserBackground() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(Capa::USER_BACKGROUND))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oSettings = $this->SettingsProvider()->Load($oAccount);
		if ($oAccount && $oSettings)
		{
			$this->StorageProvider()->Clear($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'background'
			);

			$oSettings->SetConf('UserBackgroundName', '');
			$oSettings->SetConf('UserBackgroundHash', '');
		}

		return $this->DefaultResponse(__FUNCTION__, $oAccount && $oSettings ?
			$this->SettingsProvider()->Save($oAccount, $oSettings) : false);
	}

	private function getMimeFileByHash(\RainLoop\Model\Account $oAccount, string $sHash) : array
	{
		$aValues = $this->getDecodedRawKeyValue($sHash);

		$sFolder = isset($aValues['Folder']) ? (string) $aValues['Folder'] : '';
		$iUid = isset($aValues['Uid']) ? (int) $aValues['Uid'] : 0;
		$sMimeIndex = isset($aValues['MimeIndex']) ? (string) $aValues['MimeIndex'] : '';

		$sContentTypeIn = isset($aValues['MimeType']) ? (string) $aValues['MimeType'] : '';
		$sFileNameIn = isset($aValues['FileName']) ? (string) $aValues['FileName'] : '';

		$oFileProvider = $this->FilesProvider();

		$sResultHash = '';

		$mResult = $this->MailClient()->MessageMimeStream(function ($rResource, $sContentType, $sFileName, $sMimeIndex = '')
			use ($oAccount, $oFileProvider, $sFileNameIn, $sContentTypeIn, &$sResultHash) {

				unset($sContentType, $sFileName, $sMimeIndex);

				if ($oAccount && \is_resource($rResource))
				{
					$sHash = \MailSo\Base\Utils::Sha1Rand($sFileNameIn.'~'.$sContentTypeIn);
					$rTempResource = $oFileProvider->GetFile($oAccount, $sHash, 'wb+');

					if (\is_resource($rTempResource))
					{
						if (false !== \MailSo\Base\Utils::MultipleStreamWriter($rResource, array($rTempResource)))
						{
							$sResultHash = $sHash;
						}

						\fclose($rTempResource);
					}
				}

			}, $sFolder, $iUid, $sMimeIndex);

		$aValues['FileHash'] = '';
		if ($mResult)
		{
			$aValues['FileHash'] = $sResultHash;
		}

		return $aValues;
	}

	private function setSettingsFromParams(\RainLoop\Settings $oSettings, string $sConfigName, string $sType = 'string', ?callable $cCallback = null) : void
	{
		if ($this->HasActionParam($sConfigName))
		{
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
