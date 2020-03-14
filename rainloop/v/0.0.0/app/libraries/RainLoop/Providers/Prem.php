<?php

namespace RainLoop\Providers;

class Prem
{

	public function __construct($oConfig, $oLogger, $oCacher)
	{
		$this->oConfig = $oConfig;
		$this->oLogger = $oLogger;
		$this->oCacher = $oCacher;
	}

	public function Type() : bool
	{
		static $bResult = null;
		if (null === $bResult)
		{
			$bResult = $this->Parser($this->Fetcher(false, true));
		}

		return $bResult;
	}

	public function IsActive() : bool
	{
		return true;
	}

	public function Parser(string $sInput, int &$iExpired = 0) : bool
	{
		$aMatch = array();
		if (\preg_match('/^EXPIRED:([\d]+)$/', $sInput, $aMatch))
		{
			$iExpired = (int) $aMatch[1];
			return \time() < $iExpired;
		}

		return false;
	}

	public function PopulateAppData(array &$aAppData)
	{
		if (\is_array($aAppData))
		{
			$aAppData['Community'] = false;

			$oConfig = $this->oConfig;
			if ($oConfig && $this->Type())
			{
				$aAppData['PremType'] = true;
				$aAppData['LoginLogo'] = $oConfig->Get('branding', 'login_logo', '');
				$aAppData['LoginBackground'] = $oConfig->Get('branding', 'login_background', '');
				$aAppData['LoginCss'] = $oConfig->Get('branding', 'login_css', '');
				$aAppData['LoginDescription'] = $oConfig->Get('branding', 'login_desc', '');
				$aAppData['UserLogo'] = $oConfig->Get('branding', 'user_logo', '');
				$aAppData['UserLogoTitle'] = $oConfig->Get('branding', 'user_logo_title', '');
				$aAppData['UserLogoMessage'] = $oConfig->Get('branding', 'user_logo_message', '');
				$aAppData['UserIframeMessage'] = $oConfig->Get('branding', 'user_iframe_message', '');
				$aAppData['UserCss'] = $oConfig->Get('branding', 'user_css', '');
				$aAppData['WelcomePageUrl'] = $oConfig->Get('branding', 'welcome_page_url', '');
				$aAppData['WelcomePageDisplay'] = \strtolower($oConfig->Get('branding', 'welcome_page_display', 'none'));
			}
		}
	}

	public function PremSection(&$oActions, &$oConfig)
	{
		if ($oActions && $oActions->HasOneOfActionParams(array(
			'LoginLogo', 'LoginBackground', 'LoginDescription', 'LoginCss',
			'UserLogo', 'UserLogoTitle', 'UserLogoMessage', 'UserIframeMessage', 'UserCss',
			'WelcomePageUrl', 'WelcomePageDisplay'
		)) && $this->Type())
		{
			$oActions->setConfigFromParams($oConfig, 'LoginLogo', 'branding', 'login_logo', 'string');
			$oActions->setConfigFromParams($oConfig, 'LoginBackground', 'branding', 'login_background', 'string');
			$oActions->setConfigFromParams($oConfig, 'LoginDescription', 'branding', 'login_desc', 'string');
			$oActions->setConfigFromParams($oConfig, 'LoginCss', 'branding', 'login_css', 'string');

			$oActions->setConfigFromParams($oConfig, 'UserLogo', 'branding', 'user_logo', 'string');
			$oActions->setConfigFromParams($oConfig, 'UserLogoTitle', 'branding', 'user_logo_title', 'string');
			$oActions->setConfigFromParams($oConfig, 'UserLogoMessage', 'branding', 'user_logo_message', 'string');
			$oActions->setConfigFromParams($oConfig, 'UserIframeMessage', 'branding', 'user_iframe_message', 'string');
			$oActions->setConfigFromParams($oConfig, 'UserCss', 'branding', 'user_css', 'string');

			$oActions->setConfigFromParams($oConfig, 'WelcomePageUrl', 'branding', 'welcome_page_url', 'string');
			$oActions->setConfigFromParams($oConfig, 'WelcomePageDisplay', 'branding', 'welcome_page_display', 'string');
		}
	}

	public function Activate(string $sDomain, string $sKey, int &$iCode) : string
	{
		$iCode = 0;
		$sContentType = '';

		$oHttp = \MailSo\Base\Http::SingletonInstance();

		$sResult = $oHttp->GetUrlAsString(APP_API_PATH.'activate/'.\urlencode($sDomain).'/'.\urlencode($sKey),
			'RainLoop/'.APP_VERSION, $sContentType, $iCode, $this->oLogger, 10,
			$this->oConfig->Get('labs', 'curl_proxy', ''), $this->oConfig->Get('labs', 'curl_proxy_auth', ''),
			array(), false
		);

		if (200 !== $iCode)
		{
			$sResult = '';
		}

		return $sResult;
	}

	public function Fetcher(bool $bForce = false, bool $bLongCache = false, int $iFastCacheTimeInMin = 10, int $iLongCacheTimeInDays = 3) : string
	{
		$sDomain = \trim(APP_SITE);

		$oConfig = $this->oConfig;
		$oLogger = $this->oLogger;
		$oCacher = $this->oCacher;

		$oHttp = \MailSo\Base\Http::SingletonInstance();

		if (0 === \strlen($sDomain) || $oHttp->CheckLocalhost($sDomain) || !$oCacher || !$oConfig || !$oCacher->Verify(true))
		{
			return 'NO';
		}

		$sDomainKeyValue = \RainLoop\KeyPathHelper::LicensingDomainKeyValue($sDomain);
		$sDomainLongKeyValue = \RainLoop\KeyPathHelper::LicensingDomainKeyOtherValue($sDomain);

		$sValue = '';
		if (!$sForce)
		{
			if ($bLongCache)
			{
				$bLock = $oCacher->GetLock($sDomainLongKeyValue);
				$iTime = $bLock ? 0 : $oCacher->GetTimer($sDomainLongKeyValue);

				if ($bLock || (0 < $iTime && \time() < $iTime + (60 * 60 * 24) * $iLongCacheTimeInDays))
				{
					$sValue = $oCacher->Get($sDomainLongKeyValue);
				}
			}
			else
			{
				$iTime = $oCacher->GetTimer($sDomainKeyValue);
				if (0 < $iTime && \time() < $iTime + 60 * $iFastCacheTimeInMin)
				{
					$sValue = $oCacher->Get($sDomainKeyValue);
				}
			}
		}

		if (0 === \strlen($sValue))
		{
			if ($bLongCache)
			{
				if (!$oCacher->SetTimer($sDomainLongKeyValue))
				{
					return 'NO';
				}

				$oCacher->SetLock($sDomainLongKeyValue);
			}

			$iCode = 0;
			$sContentType = '';

			$sValue = $oHttp->GetUrlAsString(APP_API_PATH.'status/'.\urlencode($sDomain),
				'RainLoop/'.APP_VERSION, $sContentType, $iCode, $oLogger, 5,
				$oConfig->Get('labs', 'curl_proxy', ''), $oConfig->Get('labs', 'curl_proxy_auth', ''),
				array(), false
			);

			if ($oLogger)
			{
				$oLogger->Write($sValue);
			}

			if (404 === $iCode)
			{
				$sValue = 'NO';
			}
			else if (200 !== $iCode)
			{
				$sValue = '';
			}

			$oCacher->SetTimer($sDomainKeyValue);

			$oCacher->Set($sDomainKeyValue, $sValue);
			$oCacher->Set($sDomainLongKeyValue, $sValue);

			if ($bLongCache)
			{
				$oCacher->RemoveLock($sDomainLongKeyValue);
			}
		}

		return $sValue;
	}

	public function ClearOldVersion()
	{
		$sVPath = APP_INDEX_ROOT_PATH.'rainloop/v/';

		if ($this->oLogger)
		{
			$this->oLogger->Write('Versions GC: Begin');
		}

		$aDirs = @\array_map('basename', @\array_filter(@\glob($sVPath.'*'), 'is_dir'));

		if ($this->oLogger)
		{
			$this->oLogger->Write('Versions GC: Count:'.(\is_array($aDirs) ? \count($aDirs) : 0));
		}

		if (\is_array($aDirs) && 5 < \count($aDirs))
		{
			\uasort($aDirs, 'version_compare');

			foreach ($aDirs as $sName)
			{
				if (APP_DEV_VERSION !== $sName && APP_VERSION !== $sName)
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Versions GC: Begin to remove  "'.$sVPath.$sName.'" version');
					}

					if (@\unlink($sVPath.$sName.'/index.php'))
					{
						@\MailSo\Base\Utils::RecRmDir($sVPath.$sName);
					}
					else
					{
						if ($this->oLogger)
						{
							$this->oLogger->Write('Versions GC (Error): index file cant be removed from"'.$sVPath.$sName.'"',
								\MailSo\Log\Enumerations\Type::ERROR);
						}
					}

					if ($this->oLogger)
					{
						$this->oLogger->Write('Versions GC: End to remove  "'.$sVPath.$sName.'" version');
					}

					break;
				}
			}
		}

		if ($this->oLogger)
		{
			$this->oLogger->Write('Versions GC: End');
		}
	}

	public function UpdateCore($oActions, string $sFile)
	{
		$bResult = false;

		$sNewVersion = '';
		$sTmp = $oActions->downloadRemotePackageByUrl($sFile);
		if (!empty($sTmp))
		{
			$oArchive = new \ZipArchive();
			$oArchive->open($sTmp);
			$sTmpFolder = APP_PRIVATE_DATA.\md5($sTmp);

			\mkdir($sTmpFolder);
			if (\is_dir($sTmpFolder))
			{
				$bResult = $oArchive->extractTo($sTmpFolder);
				if (!$bResult)
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Cannot extract package files: '.$oArchive->getStatusString(), \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}
				}

				if ($bResult && \file_exists($sTmpFolder.'/index.php') &&
					\is_writable(APP_INDEX_ROOT_PATH.'rainloop/') &&
					\is_writable(APP_INDEX_ROOT_PATH.'index.php') &&
					\is_dir($sTmpFolder.'/rainloop/'))
				{
					$aMatch = array();
					$sIndexFile = \file_get_contents($sTmpFolder.'/index.php');
					if (\preg_match('/\'APP_VERSION\', \'([^\']+)\'/', $sIndexFile, $aMatch) && !empty($aMatch[1]))
					{
						$sNewVersion = \trim($aMatch[1]);
					}

					if (empty($sNewVersion))
					{
						if ($this->oLogger)
						{
							$this->oLogger->Write('Unknown version', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
						}
					}
					else if (!\is_dir(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sNewVersion))
					{
						\MailSo\Base\Utils::CopyDir($sTmpFolder.'/rainloop/', APP_INDEX_ROOT_PATH.'rainloop/');

						if (\is_dir(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sNewVersion) &&
							\is_file(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sNewVersion.'/index.php'))
						{
							$bResult = \copy($sTmpFolder.'/index.php', APP_INDEX_ROOT_PATH.'index.php');

							if ($bResult)
							{
								if (\MailSo\Base\Utils::FunctionExistsAndEnabled('opcache_invalidate'))
								{
									@\opcache_invalidate(APP_INDEX_ROOT_PATH.'index.php', true);
								}

								if (\MailSo\Base\Utils::FunctionExistsAndEnabled('apc_delete_file'))
								{
									@\apc_delete_file(APP_INDEX_ROOT_PATH.'index.php');
								}
							}
						}
						else
						{
							if ($this->oLogger)
							{
								$this->oLogger->Write('Cannot copy new package files', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
								$this->oLogger->Write($sTmpFolder.'/rainloop/ -> '.APP_INDEX_ROOT_PATH.'rainloop/', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
							}
						}
					}
					else if (!empty($sNewVersion))
					{
						if ($this->oLogger)
						{
							$this->oLogger->Write('"'.$sNewVersion.'" version already installed', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
						}
					}
				}
				else if ($bResult)
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Cannot validate package files', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}
				}

				\MailSo\Base\Utils::RecRmDir($sTmpFolder);
			}
			else
			{
				if ($this->oLogger)
				{
					$this->oLogger->Write('Cannot create tmp folder: '.$sTmpFolder, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
				}
			}
			$oArchive->close();

			@\unlink($sTmp);
		}

		return $bResult;
	}
}
