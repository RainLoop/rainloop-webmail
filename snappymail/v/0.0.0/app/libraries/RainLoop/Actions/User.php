<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\Notifications;
use \RainLoop\Utils;

trait User
{
	use Accounts;
	use Contacts;
	use Filters;
	use Folders;
	use Messages;

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoLogin() : array
	{
		$sEmail = \MailSo\Base\Utils::Trim($this->GetActionParam('Email', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$sLanguage = $this->GetActionParam('Language', '');
		$bSignMe = '1' === (string) $this->GetActionParam('SignMe', '0');

		$oAccount = null;

		$this->Logger()->AddSecret($sPassword);

		try
		{
			$oAccount = $this->LoginProcess($sEmail, $sPassword,
				$bSignMe ? $this->generateSignMeToken($sEmail) : '');
			$this->Plugins()->RunHook('login.success', array($oAccount));
		}
		catch (ClientException $oException)
		{
			throw $oException;
		}

		$this->AuthToken($oAccount);

		if ($oAccount && 0 < \strlen($sLanguage))
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

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAttachmentsActions() : array
	{
		if (!$this->GetCapa(false, Capa::ATTACHMENTS_ACTIONS))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->initMailClientConnection();

		$sAction = $this->GetActionParam('Do', '');
		$aHashes = $this->GetActionParam('Hashes', null);

		$mResult = false;
		$bError = false;
		$aData = false;

		if (\is_array($aHashes) && 0 < \count($aHashes))
		{
			$aData = array();
			foreach ($aHashes as $sZipHash)
			{
				$aResult = $this->getMimeFileByHash($oAccount, $sZipHash);
				if (!empty($aResult['FileHash']))
				{
					$aData[] = $aResult;
				}
				else
				{
					$bError = true;
					break;
				}
			}
		}

		$oFilesProvider = $this->FilesProvider();
		if (!empty($sAction) && !$bError && \is_array($aData) && 0 < \count($aData) &&
			$oFilesProvider && $oFilesProvider->IsActive())
		{
			$bError = false;
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

							foreach ($aData as $aItem)
							{
								$sFileName = (string) (isset($aItem['FileName']) ? $aItem['FileName'] : 'file.dat');
								$sFileHash = (string) (isset($aItem['FileHash']) ? $aItem['FileHash'] : '');

								if (!empty($sFileHash))
								{
									$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $sFileHash);
									if (!$oZip->addFile($sFullFileNameHash, $sFileName))
									{
										$bError = true;
									}
								}
							}

							if (!$bError)
							{
								$bError = !$oZip->close();
							}
							else
							{
								$oZip->close();
							}
						} else {
							@\unlink($sZipFileName);
							$oZip = new \PharData($sZipFileName . '.zip', 0, null, \Phar::ZIP);
							$oZip->compressFiles(\Phar::GZ);

							foreach ($aData as $aItem)
							{
								$sFileName = (isset($aItem['FileName']) ? (string) $aItem['FileName'] : 'file.dat');
								$sFileHash = (isset($aItem['FileHash']) ? (string) $aItem['FileHash'] : '');

								if ($sFileHash)
								{
									$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $sFileHash);
									$oZip->addFile($sFullFileNameHash, $sFileName);
								}
							}

							$oZip->compressFiles(\Phar::GZ);

							unset($oZip);
							\rename($sZipFileName . '.zip', $sZipFileName);
						}

						foreach ($aData as $aItem)
						{
							$sFileHash = (isset($aItem['FileHash']) ? (string) $aItem['FileHash'] : '');
							if ($sFileHash)
							{
								$oFilesProvider->Clear($oAccount, $sFileHash);
							}
						}

						if (!$bError)
						{
							$mResult = array(
								'FileHash' => Utils::EncodeKeyValuesQ(array(
									'V' => APP_VERSION,
									'Account' => $oAccount ? \md5($oAccount->Hash()) : '',
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
		}
		else
		{
			$bError = true;
		}

		$this->requestSleep();
		return $this->DefaultResponse(__FUNCTION__, $bError ? false : $mResult);
	}

	public function DoLogout() : array
	{
		$oAccount = $this->getAccountFromToken(false);
		if ($oAccount)
		{
			if ($oAccount->SignMe())
			{
				$this->ClearSignMeData($oAccount);
			}

			if (!$oAccount->IsAdditionalAccount())
			{
				Utils::ClearCookie(self::AUTH_SPEC_TOKEN_KEY);
			}
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoAppDelayStart() : array
	{
		$this->Plugins()->RunHook('service.app-delay-start-begin');

		Utils::UpdateConnectionToken();

		$bMainCache = false;
		$bFilesCache = false;
		$bVersionsCache = false;

		$iOneDay1 = 60 * 60 * 23;
		$iOneDay2 = 60 * 60 * 25;
		$iOneDay3 = 60 * 60 * 30;

		$sTimers = $this->StorageProvider()->Get(null,
			\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers', '');

		$aTimers = \explode(',', $sTimers);

		$iMainCacheTime = !empty($aTimers[0]) && \is_numeric($aTimers[0]) ? (int) $aTimers[0] : 0;
		$iFilesCacheTime = !empty($aTimers[1]) && \is_numeric($aTimers[1]) ? (int) $aTimers[1] : 0;
		$iVersionsCacheTime = !empty($aTimers[2]) && \is_numeric($aTimers[2]) ? (int) $aTimers[2] : 0;

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

		if (0 === $iVersionsCacheTime || $iVersionsCacheTime + $iOneDay3 < \time())
		{
			$bVersionsCache = true;
			$iVersionsCacheTime = \time();
		}

		if ($bMainCache || $bFilesCache || $bVersionsCache)
		{
			if (!$this->StorageProvider()->Put(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers',
				\implode(',', array($iMainCacheTime, $iFilesCacheTime, $iVersionsCacheTime))))
			{
				$bMainCache = $bFilesCache = $bVersionsCache = false;
			}
		}

		if ($bMainCache)
		{
			$this->Logger()->Write('Cacher GC: Begin');
			$this->Cacher()->GC(48);
			$this->Logger()->Write('Cacher GC: End');
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
			$oSettings->SetConf('Language', $this->ValidateLanguage($oConfig->Get('webmail', 'language', 'en')));
		}

		if ($this->GetCapa(false, Capa::THEMES, $oAccount))
		{
			$this->setSettingsFromParams($oSettingsLocal, 'Theme', 'string', function ($sTheme) use ($self) {
				return $self->ValidateTheme($sTheme);
			});
		}
		else
		{
			$oSettingsLocal->SetConf('Theme', $this->ValidateTheme($oConfig->Get('webmail', 'theme', 'Default')));
		}

		$this->setSettingsFromParams($oSettings, 'MPP', 'int', function ($iValue) {
			return (int) (\in_array($iValue, array(10, 20, 30, 50, 100, 150, 200, 300)) ? $iValue : 20);
		});

		$this->setSettingsFromParams($oSettings, 'Layout', 'int', function ($iValue) {
			return (int) (\in_array((int) $iValue, array(\RainLoop\Enumerations\Layout::NO_PREVIEW,
				\RainLoop\Enumerations\Layout::SIDE_PREVIEW, \RainLoop\Enumerations\Layout::BOTTOM_PREVIEW)) ?
					$iValue : \RainLoop\Enumerations\Layout::SIDE_PREVIEW);
		});

		$this->setSettingsFromParams($oSettings, 'EditorDefaultType', 'string');
		$this->setSettingsFromParams($oSettings, 'ShowImages', 'bool');
		$this->setSettingsFromParams($oSettings, 'RemoveColors', 'bool');
		$this->setSettingsFromParams($oSettings, 'ContactsAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'DesktopNotifications', 'bool');
		$this->setSettingsFromParams($oSettings, 'SoundNotification', 'bool');
		$this->setSettingsFromParams($oSettings, 'NotificationSound', 'string');
		$this->setSettingsFromParams($oSettings, 'UseCheckboxesInList', 'bool');
		$this->setSettingsFromParams($oSettings, 'AllowDraftAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'AutoLogout', 'int');
		$this->setSettingsFromParams($oSettings, 'MessageReadDelay', 'int');

		$this->setSettingsFromParams($oSettingsLocal, 'UseThreads', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'ReplySameFolder', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'HideUnsubscribed', 'bool');

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider()->Save($oAccount, $oSettings) &&
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	public function DoQuota() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, Capa::QUOTA, $oAccount))
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

		if ($iLimit > \count($aResult) && 0 < \strlen($sQuery))
		{
			try
			{
				// Address Book
				$oAddressBookProvider = $this->AddressBookProvider($oAccount);
				if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
				{
					$aSuggestions = $oAddressBookProvider->GetSuggestions($oAccount->ParentEmailHelper(), $sQuery, $iLimit);
					if (0 === \count($aResult))
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

		if ($iLimit > \count($aResult) && 0 < \strlen($sQuery))
		{
			$oSuggestionsProvider = $this->SuggestionsProvider();
			if ($oSuggestionsProvider && $oSuggestionsProvider->IsActive())
			{
				$aSuggestionsProviderResult = $oSuggestionsProvider->Process($oAccount, $sQuery, $iLimit);
				if (\is_array($aSuggestionsProviderResult) && 0 < \count($aSuggestionsProviderResult))
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

	public function DoComposeUploadExternals() : array
	{
		$oAccount = $this->getAccountFromToken();

		$mResult = false;
		$aExternals = $this->GetActionParam('Externals', array());
		if (\is_array($aExternals) && 0 < \count($aExternals))
		{
			$oHttp = \MailSo\Base\Http::SingletonInstance();

			$mResult = array();
			foreach ($aExternals as $sUrl)
			{
				$mResult[$sUrl] = '';

				$sTempName = \md5($sUrl);

				$iCode = 0;
				$sContentType = '';

				$rFile = $this->FilesProvider()->GetFile($oAccount, $sTempName, 'wb+');
				if ($rFile && $oHttp->SaveUrlToFile($sUrl, $rFile, '', $sContentType, $iCode, $this->Logger(), 60,
						$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', '')))
				{
					$mResult[$sUrl] = $sTempName;
				}

				if (\is_resource($rFile))
				{
					\fclose($rFile);
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	public function DoClearUserBackground() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::USER_BACKGROUND, $oAccount))
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

	protected function ClearSignMeData(\RainLoop\Model\Account $oAccount) : void
	{
		if ($oAccount) {
			Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
			$this->StorageProvider()->Clear($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'sign_me'
			);
		}
	}

	private function generateSignMeToken(string $sEmail) : string
	{
		return \MailSo\Base\Utils::Sha1Rand(APP_SALT.$sEmail);
	}

	private function getMimeFileByHash(\RainLoop\Model\Account $oAccount, string $sHash) : array
	{
		$aValues = $this->getDecodedRawKeyValue($sHash);

		$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
		$iUid = isset($aValues['Uid']) ? (int) $aValues['Uid'] : 0;
		$sMimeIndex = (string) isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '';

		$sContentTypeIn = (string) isset($aValues['MimeType']) ? $aValues['MimeType'] : '';
		$sFileNameIn = (string) isset($aValues['FileName']) ? $aValues['FileName'] : '';

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

			}, $sFolder, $iUid, true, $sMimeIndex);

		$aValues['FileHash'] = '';
		if ($mResult)
		{
			$aValues['FileHash'] = $sResultHash;
		}

		return $aValues;
	}

	private function setSettingsFromParams(\RainLoop\Settings $oSettings, string $sConfigName, string $sType = 'string', ?callable $mStringCallback = null) : void
	{
		if ($this->HasActionParam($sConfigName))
		{
			$sValue = $this->GetActionParam($sConfigName, '');
			switch ($sType)
			{
				default:
				case 'string':
					$sValue = (string) $sValue;
					if ($mStringCallback && is_callable($mStringCallback))
					{
						$sValue = call_user_func($mStringCallback, $sValue);
					}

					$oSettings->SetConf($sConfigName, (string) $sValue);
					break;

				case 'int':
					$iValue = (int) $sValue;
					$oSettings->SetConf($sConfigName, $iValue);
					break;

				case 'bool':
					$oSettings->SetConf($sConfigName, '1' === (string) $sValue);
					break;
			}
		}
	}
}
