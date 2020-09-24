<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Enumerations\PluginPropertyType;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\KeyPathHelper;
use \RainLoop\Notifications;
use \RainLoop\Utils;

trait Admin
{
	private static $AUTH_ADMIN_TOKEN_KEY = 'rlaauth';

	public function IsAdminLoggined(bool $bThrowExceptionOnFalse = true) : bool
	{
		$bResult = false;
		if ($this->Config()->Get('security', 'allow_admin_panel', true))
		{
			$aAdminHash = Utils::DecodeKeyValuesQ($this->getAdminAuthToken());
			if (!empty($aAdminHash[0]) && !empty($aAdminHash[1]) && !empty($aAdminHash[2]) &&
				'token' === $aAdminHash[0] && \md5(APP_SALT) === $aAdminHash[1] &&
				'' !== $this->Cacher(null, true)->Get(KeyPathHelper::SessionAdminKey($aAdminHash[2]), '')
			)
			{
				$bResult = true;
			}
		}

		if (!$bResult && $bThrowExceptionOnFalse)
		{
			throw new ClientException(Notifications::AuthError);
		}

		return $bResult;
	}

	private function getAdminAuthToken() : string
	{
		return Utils::GetCookie(static::$AUTH_ADMIN_TOKEN_KEY, '');
	}

	private function setAdminAuthToken(string $sToken) : void
	{
		Utils::SetCookie(static::$AUTH_ADMIN_TOKEN_KEY, $sToken, 0);
	}

	public function ClearAdminAuthToken() : void
	{
		$aAdminHash = Utils::DecodeKeyValuesQ($this->getAdminAuthToken());
		if (
			!empty($aAdminHash[0]) && !empty($aAdminHash[1]) && !empty($aAdminHash[2]) &&
			'token' === $aAdminHash[0] && \md5(APP_SALT) === $aAdminHash[1]
		)
		{
			$this->Cacher(null, true)->Delete(KeyPathHelper::SessionAdminKey($aAdminHash[2]));
		}

		Utils::ClearCookie(static::$AUTH_ADMIN_TOKEN_KEY);
	}

	private function getAdminToken() : string
	{
		$sRand = \MailSo\Base\Utils::Md5Rand();
		if (!$this->Cacher(null, true)->Set(KeyPathHelper::SessionAdminKey($sRand), \time()))
		{
			$this->oLogger->Write('Cannot store an admin token',
				\MailSo\Log\Enumerations\Type::WARNING);

			$sRand = '';
		}

		return '' === $sRand ? '' : Utils::EncodeKeyValuesQ(array('token', \md5(APP_SALT), $sRand));
	}

	private function setCapaFromParams(\RainLoop\Config\Application $oConfig, string $sParamName, string $sCapa) : void
	{
		switch ($sCapa)
		{
			case Capa::ADDITIONAL_ACCOUNTS:
				$this->setConfigFromParams($oConfig, $sParamName, 'webmail', 'allow_additional_accounts', 'bool');
				break;
			case Capa::IDENTITIES:
				$this->setConfigFromParams($oConfig, $sParamName, 'webmail', 'allow_additional_identities', 'bool');
				break;
			case Capa::TEMPLATES:
				$this->setConfigFromParams($oConfig, $sParamName, 'capa', 'x-templates', 'bool');
				break;
			case Capa::TWO_FACTOR:
				$this->setConfigFromParams($oConfig, $sParamName, 'security', 'allow_two_factor_auth', 'bool');
				break;
			case Capa::TWO_FACTOR_FORCE:
				$this->setConfigFromParams($oConfig, $sParamName, 'security', 'force_two_factor_auth', 'bool');
				break;
			case Capa::ATTACHMENT_THUMBNAILS:
				$this->setConfigFromParams($oConfig, $sParamName, 'interface', 'show_attachment_thumbnail', 'bool');
				break;
			case Capa::THEMES:
				$this->setConfigFromParams($oConfig, $sParamName, 'webmail', 'allow_themes', 'bool');
				break;
			case Capa::USER_BACKGROUND:
				$this->setConfigFromParams($oConfig, $sParamName, 'webmail', 'allow_user_background', 'bool');
				break;
			case Capa::OPEN_PGP:
				$this->setConfigFromParams($oConfig, $sParamName, 'security', 'openpgp', 'bool');
				break;
		}
	}

	public function DoAdminSettingsUpdate() : array
	{
//		sleep(3);
//		return $this->DefaultResponse(__FUNCTION__, false);

		$this->IsAdminLoggined();

		$oConfig = $this->Config();

		$self = $this;

		$this->setConfigFromParams($oConfig, 'Language', 'webmail', 'language', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage, '', false);
		});

		$this->setConfigFromParams($oConfig, 'LanguageAdmin', 'webmail', 'language_admin', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage, '', true);
		});

		$this->setConfigFromParams($oConfig, 'Theme', 'webmail', 'theme', 'string', function ($sTheme) use ($self) {
			return $self->ValidateTheme($sTheme);
		});

		$this->setConfigFromParams($oConfig, 'VerifySslCertificate', 'ssl', 'verify_certificate', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowSelfSigned', 'ssl', 'allow_self_signed', 'bool');

		$this->setConfigFromParams($oConfig, 'UseLocalProxyForExternalImages', 'labs', 'use_local_proxy_for_external_images', 'bool');

		$this->setConfigFromParams($oConfig, 'NewMoveToFolder', 'interface', 'new_move_to_folder_button', 'bool');

		$this->setConfigFromParams($oConfig, 'AllowLanguagesOnSettings', 'webmail', 'allow_languages_on_settings', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowLanguagesOnLogin', 'login', 'allow_languages_on_login', 'bool');
		$this->setConfigFromParams($oConfig, 'AttachmentLimit', 'webmail', 'attachment_size_limit', 'int');

		$this->setConfigFromParams($oConfig, 'LoginDefaultDomain', 'login', 'default_domain', 'string');

		$this->setConfigFromParams($oConfig, 'ContactsEnable', 'contacts', 'enable', 'bool');
		$this->setConfigFromParams($oConfig, 'ContactsSync', 'contacts', 'allow_sync', 'bool');
		$this->setConfigFromParams($oConfig, 'ContactsPdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoPassword', 'contacts', 'pdo_password', 'dummy');

		$this->setConfigFromParams($oConfig, 'ContactsPdoType', 'contacts', 'type', 'string', function ($sType) use ($self) {
			return $self->ValidateContactPdoType($sType);
		});

		$this->setCapaFromParams($oConfig, 'CapaAdditionalAccounts', Capa::ADDITIONAL_ACCOUNTS);
		$this->setCapaFromParams($oConfig, 'CapaIdentities', Capa::IDENTITIES);
		$this->setCapaFromParams($oConfig, 'CapaTemplates', Capa::TEMPLATES);
		$this->setCapaFromParams($oConfig, 'CapaTwoFactorAuth', Capa::TWO_FACTOR);
		$this->setCapaFromParams($oConfig, 'CapaTwoFactorAuthForce', Capa::TWO_FACTOR_FORCE);
		$this->setCapaFromParams($oConfig, 'CapaOpenPGP', Capa::OPEN_PGP);
		$this->setCapaFromParams($oConfig, 'CapaThemes', Capa::THEMES);
		$this->setCapaFromParams($oConfig, 'CapaUserBackground', Capa::USER_BACKGROUND);
		$this->setCapaFromParams($oConfig, 'CapaAttachmentThumbnails', Capa::ATTACHMENT_THUMBNAILS);

		$this->setConfigFromParams($oConfig, 'DetermineUserLanguage', 'login', 'determine_user_language', 'bool');
		$this->setConfigFromParams($oConfig, 'DetermineUserDomain', 'login', 'determine_user_domain', 'bool');

		$this->setConfigFromParams($oConfig, 'Title', 'webmail', 'title', 'string');
		$this->setConfigFromParams($oConfig, 'LoadingDescription', 'webmail', 'loading_description', 'string');
		$this->setConfigFromParams($oConfig, 'FaviconUrl', 'webmail', 'favicon_url', 'string');

		$this->setConfigFromParams($oConfig, 'TokenProtection', 'security', 'csrf_protection', 'bool');
		$this->setConfigFromParams($oConfig, 'EnabledPlugins', 'plugins', 'enable', 'bool');

		if ($this->HasOneOfActionParams(array(
			'LoginLogo', 'LoginBackground', 'LoginDescription', 'LoginCss',
			'UserLogo', 'UserLogoTitle', 'UserLogoMessage', 'UserIframeMessage', 'UserCss'
		)))
		{
			$this->setConfigFromParams($oConfig, 'LoginLogo', 'branding', 'login_logo', 'string');
			$this->setConfigFromParams($oConfig, 'LoginBackground', 'branding', 'login_background', 'string');
			$this->setConfigFromParams($oConfig, 'LoginDescription', 'branding', 'login_desc', 'string');
			$this->setConfigFromParams($oConfig, 'LoginCss', 'branding', 'login_css', 'string');

			$this->setConfigFromParams($oConfig, 'UserLogo', 'branding', 'user_logo', 'string');
			$this->setConfigFromParams($oConfig, 'UserLogoTitle', 'branding', 'user_logo_title', 'string');
			$this->setConfigFromParams($oConfig, 'UserLogoMessage', 'branding', 'user_logo_message', 'string');
			$this->setConfigFromParams($oConfig, 'UserIframeMessage', 'branding', 'user_iframe_message', 'string');
			$this->setConfigFromParams($oConfig, 'UserCss', 'branding', 'user_css', 'string');
		}

		return $this->DefaultResponse(__FUNCTION__, $oConfig->Save());
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAdminLogin() : array
	{
		$sLogin = trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');

		$this->Logger()->AddSecret($sPassword);

		if (0 === strlen($sLogin) || 0 === strlen($sPassword) ||
			!$this->Config()->Get('security', 'allow_admin_panel', true) ||
			$sLogin !== $this->Config()->Get('security', 'admin_login', '') ||
			!$this->Config()->ValidatePassword($sPassword))
		{
			$this->loginErrorDelay();
			$this->LoggerAuthHelper(null, $this->getAdditionalLogParamsByUserLogin($sLogin, true));
			if ($this->Config()->Get('logs', 'auth_logging', false)
			 && $this->Config()->Get('security', 'allow_admin_panel', true)
			 && \openlog('rainloop', 0, \LOG_AUTHPRIV))
			{
				\syslog(\LOG_ERR, $this->compileLogParams('Admin Auth failed: ip={request:ip} user='.$sLogin));
				\closelog();
			}
			throw new ClientException(Notifications::AuthError);
		}

		$sToken = $this->getAdminToken();
		$this->setAdminAuthToken($sToken);

		return $this->DefaultResponse(__FUNCTION__, $sToken ? true : false);
	}

	public function DoAdminLogout() : array
	{
		$this->ClearAdminAuthToken();
		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoAdminPing() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__, true);
	}

	public function DoAdminContactsTest() : array
	{
		$this->IsAdminLoggined();

		$oConfig = $this->Config();

		$this->setConfigFromParams($oConfig, 'ContactsPdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoPassword', 'contacts', 'pdo_password', 'dummy');

		$self = $this;
		$this->setConfigFromParams($oConfig, 'ContactsPdoType', 'contacts', 'type', 'string', function ($sType) use ($self) {
			return $self->ValidateContactPdoType($sType);
		});

		$sTestMessage = $this->AddressBookProvider(null, true)->Test();
		return $this->DefaultResponse(__FUNCTION__, array(
			'Result' => '' === $sTestMessage,
			'Message' => \MailSo\Base\Utils::Utf8Clear($sTestMessage, '?')
		));
	}

	public function DoAdminPasswordUpdate() : array
	{
		$this->IsAdminLoggined();

		$bResult = false;
		$oConfig = $this->Config();

		$sLogin = \trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$this->Logger()->AddSecret($sPassword);

		$sNewPassword = $this->GetActionParam('NewPassword', '');
		if (0 < \strlen(\trim($sNewPassword)))
		{
			$this->Logger()->AddSecret($sNewPassword);
		}

		if ($oConfig->ValidatePassword($sPassword))
		{
			if (0 < \strlen($sLogin))
			{
				$oConfig->Set('security', 'admin_login', $sLogin);
			}

			if (0 < \strlen(\trim($sNewPassword)))
			{
				$oConfig->SetPassword($sNewPassword);
			}

			$bResult = true;
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult ?
			($oConfig->Save() ? array('Weak' => $oConfig->ValidatePassword('12345')) : false) : false);
	}

	public function DoAdminDomainLoad() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__,
			$this->DomainProvider()->Load($this->GetActionParam('Name', ''), false, false));
	}

	public function DoAdminDomainList() : array
	{
		$this->IsAdminLoggined();

		$iOffset = (int) $this->GetActionParam('Offset', 0);
		$iLimit = (int) $this->GetActionParam('Limit', 20);
		$sSearch = (string) $this->GetActionParam('Search', '');
		$bIncludeAliases = '1' === (string) $this->GetActionParam('IncludeAliases', '1');

		$iOffset = 0;
		$sSearch = '';
		$iLimit = $this->Config()->Get('labs', 'domain_list_limit', 99);

		return $this->DefaultResponse(__FUNCTION__,
			$this->DomainProvider()->GetList($iOffset, $iLimit, $sSearch, $bIncludeAliases));
	}

	public function DoAdminDomainDelete() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__,
			$this->DomainProvider()->Delete((string) $this->GetActionParam('Name', '')));
	}

	public function DoAdminDomainDisable() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__, $this->DomainProvider()->Disable(
			(string) $this->GetActionParam('Name', ''),
			'1' === (string) $this->GetActionParam('Disabled', '0')
		));
	}

	public function DoAdminDomainSave() : array
	{
		$this->IsAdminLoggined();

		$oDomain = $this->DomainProvider()->LoadOrCreateNewFromAction($this);

		return $this->DefaultResponse(__FUNCTION__,
			$oDomain ? $this->DomainProvider()->Save($oDomain) : false);
	}

	public function DoAdminDomainAliasSave() : array
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__, $this->DomainProvider()->SaveAlias(
			(string) $this->GetActionParam('Name', ''),
			(string) $this->GetActionParam('Alias', '')
		));
	}

	public function DoAdminDomainTest() : array
	{
		$this->IsAdminLoggined();

		$bImapResult = false;
		$sImapErrorDesc = '';
		$bSmtpResult = false;
		$sSmtpErrorDesc = '';
		$bSieveResult = false;
		$sSieveErrorDesc = '';

		$iImapTime = 0;
		$iSmtpTime = 0;
		$iSieveTime = 0;

		$iConnectionTimeout = 5;

		$oDomain = $this->DomainProvider()->LoadOrCreateNewFromAction($this, 'domain-test-connection.de');
		if ($oDomain)
		{
			try
			{
				$oImapClient = new \MailSo\Imap\ImapClient();
				$oImapClient->SetLogger($this->Logger());
				$oImapClient->SetTimeOuts($iConnectionTimeout);

				$iTime = \microtime(true);
				$oImapClient->Connect($oDomain->IncHost(), $oDomain->IncPort(), $oDomain->IncSecure(),
					!!$this->Config()->Get('ssl', 'verify_certificate', false),
					!!$this->Config()->Get('ssl', 'allow_self_signed', true),
					$this->Config()->Get('ssl', 'client_cert', '')
				);

				$iImapTime = \microtime(true) - $iTime;
				$oImapClient->Disconnect();
				$bImapResult = true;
			}
			catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
			{
				$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
				$sImapErrorDesc = $oException->getSocketMessage();
				if (empty($sImapErrorDesc))
				{
					$sImapErrorDesc = $oException->getMessage();
				}
			}
			catch (\Throwable $oException)
			{
				$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
				$sImapErrorDesc = $oException->getMessage();
			}

			if ($oDomain->OutUsePhpMail())
			{
				$bSmtpResult = \MailSo\Base\Utils::FunctionExistsAndEnabled('mail');
				if (!$bSmtpResult)
				{
					$sSmtpErrorDesc = 'PHP: mail() function is undefined';
				}
			}
			else
			{
				try
				{
					$oSmtpClient = new \MailSo\Smtp\SmtpClient();
					$oSmtpClient->SetLogger($this->Logger());
					$oSmtpClient->SetTimeOuts($iConnectionTimeout);

					$iTime = \microtime(true);
					$oSmtpClient->Connect($oDomain->OutHost(), $oDomain->OutPort(), $oDomain->OutSecure(),
						!!$this->Config()->Get('ssl', 'verify_certificate', false),
						!!$this->Config()->Get('ssl', 'allow_self_signed', true),
						'', \MailSo\Smtp\SmtpClient::EhloHelper()
					);

					$iSmtpTime = \microtime(true) - $iTime;
					$oSmtpClient->Disconnect();
					$bSmtpResult = true;
				}
				catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
					$sSmtpErrorDesc = $oException->getSocketMessage();
					if (empty($sSmtpErrorDesc))
					{
						$sSmtpErrorDesc = $oException->getMessage();
					}
				}
				catch (\Throwable $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
					$sSmtpErrorDesc = $oException->getMessage();
				}
			}

			if ($oDomain->UseSieve())
			{
				try
				{
					$oSieveClient = new \MailSo\Sieve\ManageSieveClient();
					$oSieveClient->SetLogger($this->Logger());
					$oSieveClient->SetTimeOuts($iConnectionTimeout);
					$oSieveClient->__USE_INITIAL_AUTH_PLAIN_COMMAND = !!$this->Config()->Get('labs', 'sieve_auth_plain_initial', true);

					$iTime = \microtime(true);
					$oSieveClient->Connect($oDomain->SieveHost(), $oDomain->SievePort(), $oDomain->SieveSecure(),
						!!$this->Config()->Get('ssl', 'verify_certificate', false),
						!!$this->Config()->Get('ssl', 'allow_self_signed', true)
					);

					$iSieveTime = \microtime(true) - $iTime;
					$oSieveClient->Disconnect();
					$bSieveResult = true;
				}
				catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
					$sSieveErrorDesc = $oException->getSocketMessage();
					if (empty($sSieveErrorDesc))
					{
						$sSieveErrorDesc = $oException->getMessage();
					}
				}
				catch (\Throwable $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
					$sSieveErrorDesc = $oException->getMessage();
				}
			}
			else
			{
				$bSieveResult = true;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Imap' => $bImapResult ? true : $sImapErrorDesc,
			'Smtp' => $bSmtpResult ? true : $sSmtpErrorDesc,
			'Sieve' => $bSieveResult ? true : $sSieveErrorDesc
		));
	}

	private function snappyMailRepo() : string
	{
		return 'https://snappymail.eu/repository/';
	}

	private function rainLoopUpdatable() : bool
	{
		return file_exists(APP_INDEX_ROOT_PATH.'index.php') &&
			is_writable(APP_INDEX_ROOT_PATH.'index.php') &&
			is_writable(APP_INDEX_ROOT_PATH.'rainloop/') &&
			APP_VERSION !== APP_DEV_VERSION
		;
	}

	private function getRepositoryDataByUrl(string $sRepo, bool &$bReal = false) : array
	{
		$bReal = false;
		$aRep = null;

		$sRep = '';
		$sRepoFile = 'packages.json';
		$iRepTime = 0;

		$oHttp = \MailSo\Base\Http::SingletonInstance();

		$sCacheKey = KeyPathHelper::RepositoryCacheFile($sRepo, $sRepoFile);
		$sRep = $this->Cacher()->Get($sCacheKey);
		if ('' !== $sRep)
		{
			$iRepTime = $this->Cacher()->GetTimer($sCacheKey);
		}

		if ('' === $sRep || 0 === $iRepTime || \time() - 3600 > $iRepTime)
		{
			$iCode = 0;
			$sContentType = '';

			$sRepPath = $sRepo.$sRepoFile;
			$sRep = '' !== $sRepo ? $oHttp->GetUrlAsString($sRepPath, 'SnappyMail', $sContentType, $iCode, $this->Logger(), 10,
				$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', '')) : false;

			if (false !== $sRep)
			{
				$aRep = \json_decode($sRep);
				$bReal = \is_array($aRep) && 0 < \count($aRep);

				if ($bReal)
				{
					$this->Cacher()->Set($sCacheKey, $sRep);
					$this->Cacher()->SetTimer($sCacheKey);
				}
			}
			else
			{
				$this->Logger()->Write('Cannot read remote repository file: '.$sRepPath, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
			}
		}
		else if ('' !== $sRep)
		{
			$aRep = \json_decode($sRep, false, 10);
			$bReal = \is_array($aRep) && 0 < \count($aRep);
		}

		$aResult = array();
		if (\is_array($aRep))
		{
			foreach ($aRep as $oItem)
			{
				if ($oItem && isset($oItem->type, $oItem->id, $oItem->name,
					$oItem->version, $oItem->release, $oItem->file, $oItem->description))
				{
					if (!empty($oItem->required) && APP_DEV_VERSION !== APP_VERSION && version_compare(APP_VERSION, $oItem->required, '<'))
					{
						continue;
					}

					if (!empty($oItem->depricated) && APP_DEV_VERSION !== APP_VERSION && version_compare(APP_VERSION, $oItem->depricated, '>='))
					{
						continue;
					}

					if ('plugin' === $oItem->type)
					{
						$aResult[] = array(
							'type' => $oItem->type,
							'id' => $oItem->id,
							'name' => $oItem->name,
							'installed' => '',
							'version' => $oItem->version,
							'file' => $oItem->file,
							'release' => $oItem->release,
							'desc' => $oItem->description
						);
					}
				}
			}
		}

		return $aResult;
	}

	private function getRepositoryData(bool &$bReal, bool &$bRainLoopUpdatable) : array
	{
		$bRainLoopUpdatable = $this->rainLoopUpdatable();

		$aResult = $this->getRepositoryDataByUrl($this->snappyMailRepo(), $bReal);

		$aSub = array();
		foreach ($aResult as $aItem)
		{
			if ('plugin' === $aItem['type'])
			{
				$aSub[] = $aItem;
			}
		}
		$aResult = $aSub;
		unset($aSub);

		$aInstalled = $this->Plugins()->InstalledPlugins();
		foreach ($aResult as &$aItem)
		{
			if ('plugin' === $aItem['type'])
			{
				foreach ($aInstalled as &$aSubItem)
				{
					if (\is_array($aSubItem) && isset($aSubItem[0]) && $aSubItem[0] === $aItem['id'])
					{
						$aSubItem[2] = true;
						$aItem['installed'] = $aSubItem[1];
					}
				}
			}
		}

		foreach ($aInstalled as $aSubItemSec)
		{
			if ($aSubItemSec && !isset($aSubItemSec[2]))
			{
				\array_push($aResult, array(
					'type' => 'plugin',
					'id' => $aSubItemSec[0],
					'name' => $aSubItemSec[0],
					'installed' => $aSubItemSec[1],
					'version' => '',
					'file' => '',
					'release' => '',
					'desc' => ''
				));
			}
		}

		foreach ($aResult as &$aItem)
		{
			$aItem['compare'] = \version_compare($aItem['installed'], $aItem['version'], '<');
			$aItem['canBeDeleted'] = '' !== $aItem['installed'] && 'plugin' === $aItem['type'];
			$aItem['canBeUpdated'] = $aItem['compare'];
			$aItem['canBeInstalled'] = true;
		}

		return $aResult;
	}

	public function DoAdminPackagesList() : array
	{
		$this->IsAdminLoggined();

		$bReal = false;
		$bRainLoopUpdatable = false;
		$aList = $this->getRepositoryData($bReal, $bRainLoopUpdatable);

		return $this->DefaultResponse(__FUNCTION__, array(
			 'Real' => $bReal,
			 'MainUpdatable' => $bRainLoopUpdatable,
			 'List' => $aList
		));
	}

	public function DoAdminPackageDelete() : array
	{
		$this->IsAdminLoggined();

		$sId = $this->GetActionParam('Id', '');

		$bReal = false;
		$bRainLoopUpdatable = false;
		$aList = $this->getRepositoryData($bReal, $bRainLoopUpdatable);

		$sResultId = '';
		foreach ($aList as $oItem)
		{
			if ($oItem && 'plugin' === $oItem['type'] && $sId === $oItem['id'])
			{
				$sResultId = $sId;
				break;
			}
		}

		$bResult = false;
		if ('' !== $sResultId)
		{
			$bResult = \MailSo\Base\Utils::RecRmDir(APP_PLUGINS_PATH.$sResultId);
			if ($bResult)
			{
				$this->pluginEnable($sResultId, false);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	private function downloadRemotePackageByUrl(string $sUrl) : string
	{
		$bResult = false;
		$sTmp = APP_PRIVATE_DATA.\md5(\microtime(true).$sUrl).'.zip';
		$pDest = \fopen($sTmp, 'w+b');
		if ($pDest)
		{
			$iCode = 0;
			$sContentType = '';

			\set_time_limit(120);

			$oHttp = \MailSo\Base\Http::SingletonInstance();
			$bResult = $oHttp->SaveUrlToFile($sUrl, $pDest, $sTmp, $sContentType, $iCode, $this->Logger(), 60,
				$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', ''));

			if (!$bResult)
			{
				$this->Logger()->Write('Cannot save url to temp file: ', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
				$this->Logger()->Write($sUrl.' -> '.$sTmp, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
			}

			\fclose($pDest);
		}
		else
		{
			$this->Logger()->Write('Cannot create temp file: '.$sTmp, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
		}

		return $bResult ? $sTmp : '';
	}

	public function DoAdminPackageInstall() : array
	{
		$this->IsAdminLoggined();

		$sType = $this->GetActionParam('Type', '');
		$sId = $this->GetActionParam('Id', '');
		$sFile = $this->GetActionParam('File', '');

		$this->Logger()->Write('Start package install: '.$sFile.' ('.$sType.')', \MailSo\Log\Enumerations\Type::INFO, 'INSTALLER');

		$sRealFile = '';

		$bReal = false;
		$bRainLoopUpdatable = false;
		$aList = $this->getRepositoryData($bReal, $bRainLoopUpdatable);

		if ('plugin' === $sType)
		{
			foreach ($aList as $oItem)
			{
				if ($oItem && $sFile === $oItem['file'] && $sId === $oItem['id'])
				{
					$sRealFile = $sFile;
					break;
				}
			}
		}

		$sTmp = '';
		$bResult = false;
		if ('' !== $sRealFile)
		{
			$sTmp = $this->downloadRemotePackageByUrl($this->snappyMailRepo().$sRealFile);
		}

		if ('' !== $sTmp)
		{
			$oArchive = new \ZipArchive();
			$oArchive->open($sTmp);
			if ('plugin' === $sType)
			{
				$bResult = true;
				if (\is_dir(APP_PLUGINS_PATH.$sId))
				{
					$bResult = \MailSo\Base\Utils::RecRmDir(APP_PLUGINS_PATH.$sId);
					if (!$bResult)
					{
						$this->Logger()->Write('Cannot remove previous plugin folder: '.$sId, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}
				}

				if ($bResult)
				{
					$bResult = $oArchive->extractTo(APP_PLUGINS_PATH);
					if (!$bResult)
					{
						$this->Logger()->Write('Cannot extract package files: '.$oArchive->getStatusString(), \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}
				}
			}
			$oArchive->close();

			\unlink($sTmp);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult ?
			('plugin' !== $sType ? array('Reload' => true) : true) : false);
	}

	public function DoAdminPluginList() : array
	{
		$this->IsAdminLoggined();

		$aResult = array();

		$sEnabledPlugins = $this->Config()->Get('plugins', 'enabled_list', '');
		$aEnabledPlugins = \explode(',', \strtolower($sEnabledPlugins));
		$aEnabledPlugins = \array_map('trim', $aEnabledPlugins);

		$aList = $this->Plugins()->InstalledPlugins();
		foreach ($aList as $aItem)
		{
			$aResult[] = array(
				'Name' => $aItem[0],
				'Enabled' => \in_array(\strtolower($aItem[0]), $aEnabledPlugins),
				'Configured' => false
			);
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	private function pluginEnable(string $sName, bool $bEnable = true) : bool
	{
		if (0 === \strlen($sName))
		{
			return false;
		}

		$oConfig = $this->Config();

		$sEnabledPlugins = $oConfig->Get('plugins', 'enabled_list', '');
		$aEnabledPlugins = \explode(',', \strtolower($sEnabledPlugins));
		$aEnabledPlugins = \array_map('trim', $aEnabledPlugins);

		$aNewEnabledPlugins = array();
		if ($bEnable)
		{
			$aNewEnabledPlugins = $aEnabledPlugins;
			$aNewEnabledPlugins[] = $sName;
		}
		else
		{
			foreach ($aEnabledPlugins as $sPlugin)
			{
				if ($sName !== $sPlugin && 0 < \strlen($sPlugin))
				{
					$aNewEnabledPlugins[] = $sPlugin;
				}
			}
		}

		$aNewEnabledPlugins = \array_unique($aNewEnabledPlugins);
		$oConfig->Set('plugins', 'enabled_list', \trim(\implode(',', $aNewEnabledPlugins), ' ,'));

		return $oConfig->Save();
	}

	public function DoAdminPluginDisable() : array
	{
		$this->IsAdminLoggined();

		$sName = (string) $this->GetActionParam('Name', '');
		$bDisable = '1' === (string) $this->GetActionParam('Disabled', '1');

		if (!$bDisable)
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sName);
			if ($oPlugin)
			{
				$sValue = $oPlugin->Supported();
				if (0 < \strlen($sValue))
				{
					return $this->FalseResponse(__FUNCTION__, Notifications::UnsupportedPluginPackage, $sValue);
				}
			}
			else
			{
				return $this->FalseResponse(__FUNCTION__, Notifications::InvalidPluginPackage);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $this->pluginEnable($sName, !$bDisable));
	}

	public function DoAdminPluginLoad() : array
	{
		$this->IsAdminLoggined();

		$mResult = false;
		$sName = (string) $this->GetActionParam('Name', '');

		if (!empty($sName))
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sName);
			if ($oPlugin)
			{
				$mResult = array(
					 'Name' => $sName,
					 'Readme' => file_exists($oPlugin->Path().'/README') ? file_get_contents($oPlugin->Path().'/README') : '',
					 'Config' => array()
				);

				$aMap = $oPlugin->ConfigMap();
				$oConfig = $oPlugin->Config();
				if (is_array($aMap))
				{
					foreach ($aMap as $oItem)
					{
						if ($oItem && ($oItem instanceof \RainLoop\Plugins\Property))
						{
							$aItem = $oItem->ToArray();
							$aItem[0] = $oConfig->Get('plugin', $oItem->Name(), '');
							if (PluginPropertyType::PASSWORD === $oItem->Type())
							{
								$aItem[0] = APP_DUMMY;
							}

							$mResult['Config'][] = $aItem;
						}
					}
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	public function DoAdminPluginSettingsUpdate() : array
	{
		$this->IsAdminLoggined();

		$mResult = false;
		$sName = (string) $this->GetActionParam('Name', '');

		if (!empty($sName))
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sName);
			if ($oPlugin)
			{
				$oConfig = $oPlugin->Config();
				$aMap = $oPlugin->ConfigMap();
				if (is_array($aMap))
				{
					foreach ($aMap as $oItem)
					{
						$sValue = $this->GetActionParam('_'.$oItem->Name(), $oConfig->Get('plugin', $oItem->Name()));
						if (PluginPropertyType::PASSWORD !== $oItem->Type() || APP_DUMMY !== $sValue)
						{
							$mResultValue = null;
							switch ($oItem->Type()) {
								case PluginPropertyType::INT:
									$mResultValue  = (int) $sValue;
									break;
								case PluginPropertyType::BOOL:
									$mResultValue  = '1' === (string) $sValue;
									break;
								case PluginPropertyType::SELECTION:
									if (is_array($oItem->DefaultValue()) && in_array($sValue, $oItem->DefaultValue()))
									{
										$mResultValue = (string) $sValue;
									}
									break;
								case PluginPropertyType::PASSWORD:
								case PluginPropertyType::STRING:
								case PluginPropertyType::STRING_TEXT:
									$mResultValue = (string) $sValue;
									break;
							}

							if (null !== $mResultValue)
							{
								$oConfig->Set('plugin', $oItem->Name(), $mResultValue);
							}
						}
					}
				}

				$mResult = $oConfig->Save();
			}
		}

		if (!$mResult)
		{
			throw new ClientException(Notifications::CantSavePluginSettings);
		}

		return $this->DefaultResponse(__FUNCTION__, true);
	}

}
