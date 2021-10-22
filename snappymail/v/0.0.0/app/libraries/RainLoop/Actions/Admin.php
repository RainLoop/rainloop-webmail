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
		$sRand = \MailSo\Base\Utils::Sha1Rand();
		if (!$this->Cacher(null, true)->Set(KeyPathHelper::SessionAdminKey($sRand), \time()))
		{
			$this->oLogger->Write('Cannot store an admin token',
				\MailSo\Log\Enumerations\Type::WARNING);
			return '';
		}

		return Utils::EncodeKeyValuesQ(array('token', \md5(APP_SALT), $sRand));
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
		$this->setConfigFromParams($oConfig, 'hideSubmitButton', 'login', 'hide_submit_button', 'bool');
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

		$totp = $this->Config()->Get('security', 'admin_totp', '');

		if (!\strlen($sLogin) || !\strlen($sPassword) ||
			!$this->Config()->Get('security', 'allow_admin_panel', true) ||
			$sLogin !== $this->Config()->Get('security', 'admin_login', '') ||
			!$this->Config()->ValidatePassword($sPassword)
			|| ($totp && !\SnappyMail\TOTP::Verify($totp, $this->GetActionParam('TOTP', ''))))
		{
			$this->loginErrorDelay();
			$this->LoggerAuthHelper(null, $this->getAdditionalLogParamsByUserLogin($sLogin, true));
			if ($this->Config()->Get('logs', 'auth_logging', false)
			 && $this->Config()->Get('security', 'allow_admin_panel', true)
			 && \openlog('snappymail', 0, \LOG_AUTHPRIV))
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
		if (\strlen(\trim($sNewPassword)))
		{
			$this->Logger()->AddSecret($sNewPassword);
		}

		$passfile = APP_PRIVATE_DATA.'admin_password.txt';

		if ($oConfig->ValidatePassword($sPassword))
		{
			if (\strlen($sLogin))
			{
				$oConfig->Set('security', 'admin_login', $sLogin);
			}

			if (\strlen(\trim($sNewPassword)))
			{
				$oConfig->SetPassword($sNewPassword);
				if (\is_file($passfile) && \trim(\file_get_contents($passfile)) !== $sNewPassword) {
					\unlink($passfile);
				}
			}

			$bResult = $oConfig->Save();
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult
			? array('Weak' => \is_file($passfile))
			: false);
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

		$iConnectionTimeout = 5;

		$oDomain = $this->DomainProvider()->LoadOrCreateNewFromAction($this, 'test.example.com');
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

					$iTime = \microtime(true);
					$oSieveClient->Connect($oDomain->SieveHost(), $oDomain->SievePort(), $oDomain->SieveSecure(),
						!!$this->Config()->Get('ssl', 'verify_certificate', false),
						!!$this->Config()->Get('ssl', 'allow_self_signed', true)
					);

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
		return 'https://snappymail.eu/repository/v2/';
	}

	private function getRepositoryDataByUrl(bool &$bReal = false) : array
	{
		$bReal = false;
		$aRep = null;

		$sRep = '';
		$sRepoFile = 'packages.json';
		$iRepTime = 0;

		$sCacheKey = KeyPathHelper::RepositoryCacheFile(\SnappyMail\Repository::BASE_URL, $sRepoFile);
		$sRep = $this->Cacher()->Get($sCacheKey);
		if ('' !== $sRep)
		{
			$iRepTime = $this->Cacher()->GetTimer($sCacheKey);
		}

		if ('' === $sRep || 0 === $iRepTime || \time() - 3600 > $iRepTime)
		{
			$sRep = \SnappyMail\Repository::get($sRepoFile,
				$this->Config()->Get('labs', 'curl_proxy', ''),
				$this->Config()->Get('labs', 'curl_proxy_auth', '')
			);
			if ($sRep)
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
				throw new \Exception('Cannot read remote repository file: '.$sRepoFile);
			}
		}
		else if ('' !== $sRep)
		{
			$aRep = \json_decode($sRep, false, 10);
			$bReal = \is_array($aRep) && 0 < \count($aRep);
		}

		return \is_array($aRep) ? $aRep : [];
	}

	private function getRepositoryData(bool &$bReal, string &$sError) : array
	{
		$aResult = array();
		try {
			foreach ($this->getRepositoryDataByUrl($bReal) as $oItem) {
				if ($oItem && isset($oItem->type, $oItem->id, $oItem->name,
					$oItem->version, $oItem->release, $oItem->file, $oItem->description))
				{
					if (!empty($oItem->required) && APP_DEV_VERSION !== APP_VERSION && version_compare(APP_VERSION, $oItem->required, '<')) {
						continue;
					}

					if (!empty($oItem->depricated) && APP_DEV_VERSION !== APP_VERSION && version_compare(APP_VERSION, $oItem->depricated, '>=')) {
						continue;
					}

					if ('plugin' === $oItem->type) {
						$aResult[$oItem->id] = array(
							'type' => $oItem->type,
							'id' => $oItem->id,
							'name' => $oItem->name,
							'installed' => '',
							'enabled' => true,
							'version' => $oItem->version,
							'file' => $oItem->file,
							'release' => $oItem->release,
							'desc' => $oItem->description,
							'canBeDeleted' => false,
							'canBeUpdated' => true
						);
					}
				}
			}
		} catch (\Throwable $e) {
			$sError = "{$e->getCode()} {$e->getMessage()}";
			$this->Logger()->Write($sError, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
		}

		$aEnabledPlugins = \array_map('trim',
			\explode(',', \strtolower($this->Config()->Get('plugins', 'enabled_list', '')))
		);

		$aInstalled = $this->Plugins()->InstalledPlugins();
		foreach ($aInstalled as $aItem) {
			if ($aItem) {
				if (isset($aResult[$aItem[0]])) {
					$aResult[$aItem[0]]['installed'] = $aItem[1];
					$aResult[$aItem[0]]['enabled'] = \in_array(\strtolower($aItem[0]), $aEnabledPlugins);
					$aResult[$aItem[0]]['canBeDeleted'] = true;
					$aResult[$aItem[0]]['canBeUpdated'] = \version_compare($aItem[1], $aResult[$aItem[0]]['version'], '<');
				} else {
					\array_push($aResult, array(
						'type' => 'plugin',
						'id' => $aItem[0],
						'name' => $aItem[0],
						'installed' => $aItem[1],
						'enabled' => \in_array(\strtolower($aItem[0]), $aEnabledPlugins),
						'version' => '',
						'file' => '',
						'release' => '',
						'desc' => '',
						'canBeDeleted' => true,
						'canBeUpdated' => false
					));
				}
			}
		}

		return \array_values($aResult);
	}

	public function DoAdminPackagesList() : array
	{
		$this->IsAdminLoggined();

		$bReal = false;
		$sError = '';
		$aList = $this->getRepositoryData($bReal, $sError);

		$bRainLoopUpdatable = \file_exists(APP_INDEX_ROOT_PATH.'index.php')
		 && \is_writable(APP_INDEX_ROOT_PATH.'index.php')
		 && \is_writable(APP_INDEX_ROOT_PATH.'snappymail/')
		 && APP_VERSION !== APP_DEV_VERSION;

//		\uksort($aList, function($a, $b){return \strcasecmp($a['name'], $b['name']);});

		return $this->DefaultResponse(__FUNCTION__, array(
			 'Real' => $bReal,
			 'MainUpdatable' => $bRainLoopUpdatable,
			 'List' => $aList,
			 'Error' => $sError
		));
	}

	public function DoAdminPackageDelete() : array
	{
		$this->IsAdminLoggined();

		$sId = $this->GetActionParam('Id', '');

		$bResult = static::deletePackageDir($sId);
		$this->pluginEnable($sId, false);

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	private static function deletePackageDir(string $sId) : bool
	{
		$sPath = APP_PLUGINS_PATH.$sId;
		return (!\is_dir($sPath) || \MailSo\Base\Utils::RecRmDir($sPath))
			&& (!\is_file("{$sPath}.phar") || \unlink("{$sPath}.phar"));
	}

	public function DoAdminPackageInstall() : array
	{
		$this->IsAdminLoggined();

		$sType = $this->GetActionParam('Type', '');
		$sId = $this->GetActionParam('Id', '');
		$sFile = $this->GetActionParam('File', '');

		$this->Logger()->Write('Start package install: '.$sFile.' ('.$sType.')', \MailSo\Log\Enumerations\Type::INFO, 'INSTALLER');

		$sRealFile = '';

		$bResult = false;
		$sTmp = null;
		try {
			if ('plugin' === $sType) {
				$bReal = false;
				$sError = '';
				$aList = $this->getRepositoryData($bReal, $sError);
				if ($sError) {
					throw new \Exception($sError);
				}
				foreach ($aList as $oItem) {
					if ($oItem && $sFile === $oItem['file'] && $sId === $oItem['id']) {
						$sRealFile = $sFile;
						$sTmp = \SnappyMail\Repository::download($sFile,
							$this->Config()->Get('labs', 'curl_proxy', ''),
							$this->Config()->Get('labs', 'curl_proxy_auth', '')
						);
						break;
					}
				}
			}

			if ($sTmp) {
				$oArchive = new \PharData($sTmp, 0, $sRealFile);
				if (static::deletePackageDir($sId)) {
					if ('.phar' === \substr($sRealFile, -5)) {
						$bResult = \copy($sTmp, APP_PLUGINS_PATH . \basename($sRealFile));
					} else {
						$bResult = $oArchive->extractTo(\rtrim(APP_PLUGINS_PATH, '\\/'));
					}
					if (!$bResult) {
						throw new \Exception('Cannot extract package files: '.$oArchive->getStatusString());
					}
				} else {
					throw new \Exception('Cannot remove previous plugin folder: '.$sId);
				}
			}
		} catch (\Throwable $e) {
			$this->Logger()->Write("Install package {$sRealFile} failed: {$e->getMessage()}", \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
			throw $e;
		} finally {
			$sTmp && \unlink($sTmp);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult ?
			('plugin' !== $sType ? array('Reload' => true) : true) : false);
	}

	public function DoAdminPHPExtensions() : array
	{
		$aResult = [];
		foreach (['curl','gd','gmagick','imagick','intl','ldap','pdo_mysql','pdo_pgsql','pdo_sqlite','xxtea','zip'] as $name) {
			$aResult[] = [
				'name' => $name,
				'loaded' => extension_loaded($name)
			];
		}
		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	private function pluginEnable(string $sName, bool $bEnable = true) : bool
	{
		if (!\strlen($sName))
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
				if ($sName !== $sPlugin && \strlen($sPlugin))
				{
					$aNewEnabledPlugins[] = $sPlugin;
				}
			}
		}

		$oConfig->Set('plugins', 'enabled_list', \trim(\implode(',', \array_unique($aNewEnabledPlugins)), ' ,'));

		return $oConfig->Save();
	}

	public function DoAdminPluginDisable() : array
	{
		$this->IsAdminLoggined();

		$sId = (string) $this->GetActionParam('Id', '');
		$bDisable = '1' === (string) $this->GetActionParam('Disabled', '1');

		if (!$bDisable)
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sId);
			if ($oPlugin)
			{
				$sValue = $oPlugin->Supported();
				if (\strlen($sValue))
				{
					return $this->FalseResponse(__FUNCTION__, Notifications::UnsupportedPluginPackage, $sValue);
				}
			}
			else
			{
				return $this->FalseResponse(__FUNCTION__, Notifications::InvalidPluginPackage);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $this->pluginEnable($sId, !$bDisable));
	}

	public function DoAdminPluginLoad() : array
	{
		$this->IsAdminLoggined();

		$mResult = false;
		$sId = (string) $this->GetActionParam('Id', '');

		if (!empty($sId))
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sId);
			if ($oPlugin)
			{
				$mResult = array(
					 'Id' => $sId,
					 'Name' => $oPlugin->Name(),
					 'Readme' => $oPlugin->Description(),
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
		$sId = (string) $this->GetActionParam('Id', '');

		if (!empty($sId))
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sId);
			if ($oPlugin)
			{
				$oConfig = $oPlugin->Config();
				$aMap = $oPlugin->ConfigMap();
				if (is_array($aMap))
				{
					$aSettings = (array) $this->GetActionParam('Settings', []);
					foreach ($aMap as $oItem)
					{
						$sKey = $oItem->Name();
						$sValue = $aSettings[$sKey] ?? $oConfig->Get('plugin', $sKey);
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
								case PluginPropertyType::URL:
									$mResultValue = (string) $sValue;
									break;
							}

							if (null !== $mResultValue)
							{
								$oConfig->Set('plugin', $sKey, $mResultValue);
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

	private function HasOneOfActionParams(array $aKeys) : bool
	{
		foreach ($aKeys as $sKey)
		{
			if ($this->HasActionParam($sKey))
			{
				return true;
			}
		}

		return false;
	}
}
