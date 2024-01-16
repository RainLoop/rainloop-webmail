<?php

namespace RainLoop;

use RainLoop\Enumerations\PluginPropertyType;
use RainLoop\Exceptions\ClientException;

class ActionsAdmin extends Actions
{
	use Actions\AdminDomains;
	use Actions\AdminExtensions;

	public function DoAdminClearCache() : array
	{
		$this->Cacher()->GC(0);
		if (\is_dir(APP_PRIVATE_DATA . 'cache')) {
			\MailSo\Base\Utils::RecRmDir(APP_PRIVATE_DATA.'cache');
		}
		return $this->TrueResponse();
	}

	public function DoAdminSettingsGet() : array
	{
		$aConfig = $this->Config()->jsonSerialize();
		unset($aConfig['version']);
		return $this->DefaultResponse($aConfig);
	}

	public function DoAdminSettingsSet() : array
	{
		$oConfig = $this->Config();
		foreach ($this->GetActionParam('config', []) as $sSection => $aItems) {
			foreach ($aItems as $sKey => $mValue) {
				$oConfig->Set($sSection, $sKey, $mValue);
			}
		}
		return $this->DefaultResponse($oConfig->Save());
	}

	public function DoAdminSettingsUpdate() : array
	{
//		sleep(3);
//		return $this->DefaultResponse(false);

		$this->IsAdminLoggined();

		$oConfig = $this->Config();

		$self = $this;

		$this->setConfigFromParams($oConfig, 'language', 'webmail', 'language', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage, '', false);
		});

		$this->setConfigFromParams($oConfig, 'languageAdmin', 'webmail', 'language_admin', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage, '', true);
		});

		$this->setConfigFromParams($oConfig, 'Theme', 'webmail', 'theme', 'string', function ($sTheme) use ($self) {
			return $self->ValidateTheme($sTheme);
		});

		$this->setConfigFromParams($oConfig, 'useLocalProxyForExternalImages', 'labs', 'use_local_proxy_for_external_images', 'bool');

		$this->setConfigFromParams($oConfig, 'allowLanguagesOnSettings', 'webmail', 'allow_languages_on_settings', 'bool');
		$this->setConfigFromParams($oConfig, 'allowLanguagesOnLogin', 'login', 'allow_languages_on_login', 'bool');
		$this->setConfigFromParams($oConfig, 'attachmentLimit', 'webmail', 'attachment_size_limit', 'int');

		$this->setConfigFromParams($oConfig, 'loginDefaultDomain', 'login', 'default_domain', 'string');

		$this->setConfigFromParams($oConfig, 'contactsEnable', 'contacts', 'enable', 'bool');
		$this->setConfigFromParams($oConfig, 'contactsSync', 'contacts', 'allow_sync', 'bool');
		$this->setConfigFromParams($oConfig, 'contactsPdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'contactsPdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'contactsPdoPassword', 'contacts', 'pdo_password', 'dummy');
		$this->setConfigFromParams($oConfig, 'contactsMySQLSSLCA', 'contacts', 'mysql_ssl_ca', 'string');
		$this->setConfigFromParams($oConfig, 'contactsMySQLSSLVerify', 'contacts', 'mysql_ssl_verify', 'bool');
		$this->setConfigFromParams($oConfig, 'contactsMySQLSSLCiphers', 'contacts', 'mysql_ssl_ciphers', 'string');
		$this->setConfigFromParams($oConfig, 'contactsSQLiteGlobal', 'contacts', 'sqlite_global', 'bool');
		$this->setConfigFromParams($oConfig, 'contactsSuggestionsLimit', 'contacts', 'suggestions_limit', 'int');
		$this->setConfigFromParams($oConfig, 'contactsPdoType', 'contacts', 'type', 'string', function ($sType) use ($self) {
			return Providers\AddressBook\PdoAddressBook::validPdoType($sType);
		});

		$this->setConfigFromParams($oConfig, 'CapaAdditionalAccounts', 'webmail', 'allow_additional_accounts', 'bool');
		$this->setConfigFromParams($oConfig, 'CapaIdentities', 'webmail', 'allow_additional_identities', 'bool');
		$this->setConfigFromParams($oConfig, 'CapaAttachmentThumbnails', 'interface', 'show_attachment_thumbnail', 'bool');
		$this->setConfigFromParams($oConfig, 'CapaThemes', 'webmail', 'allow_themes', 'bool');
		$this->setConfigFromParams($oConfig, 'CapaUserBackground', 'webmail', 'allow_user_background', 'bool');
		$this->setConfigFromParams($oConfig, 'CapaOpenPGP', 'security', 'openpgp', 'bool');

		$this->setConfigFromParams($oConfig, 'determineUserLanguage', 'login', 'determine_user_language', 'bool');
		$this->setConfigFromParams($oConfig, 'determineUserDomain', 'login', 'determine_user_domain', 'bool');

		$this->setConfigFromParams($oConfig, 'title', 'webmail', 'title', 'string');
		$this->setConfigFromParams($oConfig, 'loadingDescription', 'webmail', 'loading_description', 'string');
		$this->setConfigFromParams($oConfig, 'faviconUrl', 'webmail', 'favicon_url', 'string');

		$this->setConfigFromParams($oConfig, 'pluginsEnable', 'plugins', 'enable', 'bool');

		return $this->DefaultResponse($oConfig->Save());
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoAdminLogin() : array
	{
		$sLogin = trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');

		$this->logMask($sPassword);

		$totp = $this->Config()->Get('security', 'admin_totp', '');

		// \explode(':',`getent shadow root`)[1];
		if (!\strlen($sLogin) || !\strlen($sPassword) ||
			!$this->Config()->Get('security', 'allow_admin_panel', true) ||
			$sLogin !== $this->Config()->Get('security', 'admin_login', '') ||
			!$this->Config()->ValidatePassword($sPassword)
			|| ($totp && !\SnappyMail\TOTP::Verify($totp, $this->GetActionParam('TOTP', ''))))
		{
			$this->LoggerAuthHelper(null, $this->getAdditionalLogParamsByUserLogin($sLogin, true), true);
			$this->loginErrorDelay();
			throw new ClientException(Notifications::AuthError);
		}

		$sToken = $this->setAdminAuthToken();

		return $this->DefaultResponse($sToken ? $this->AppData(true) : false);
	}

	public function DoAdminLogout() : array
	{
		$sAdminKey = $this->getAdminAuthKey();
		if ($sAdminKey) {
			$this->Cacher(null, true)->Delete(KeyPathHelper::SessionAdminKey($sAdminKey));
		}
		\SnappyMail\Cookies::clear(static::$AUTH_ADMIN_TOKEN_KEY);
		return $this->TrueResponse();
	}

	public function DoAdminContactsTest() : array
	{
		$this->IsAdminLoggined();

		$oConfig = $this->Config();
		$this->setConfigFromParams($oConfig, 'PdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'PdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'PdoPassword', 'contacts', 'pdo_password', 'dummy');
		$this->setConfigFromParams($oConfig, 'PdoType', 'contacts', 'type', 'string', function ($sType) {
			return Providers\AddressBook\PdoAddressBook::validPdoType($sType);
		});
		$this->setConfigFromParams($oConfig, 'MySQLSSLCA', 'contacts', 'mysql_ssl_ca', 'string');
		$this->setConfigFromParams($oConfig, 'MySQLSSLVerify', 'contacts', 'mysql_ssl_verify', 'bool');
		$this->setConfigFromParams($oConfig, 'MySQLSSLCiphers', 'contacts', 'mysql_ssl_ciphers', 'string');
		$this->setConfigFromParams($oConfig, 'SQLiteGlobal', 'contacts', 'sqlite_global', 'bool');

		$sTestMessage = '';
		try {
			$AddressBook = new Providers\AddressBook(new Providers\AddressBook\PdoAddressBook());
			$AddressBook->SetLogger($this->oLogger);
			$sTestMessage = $AddressBook->Test();
		} catch (\Throwable $e) {
			\SnappyMail\LOG::error('AddressBook', $e->getMessage()."\n".$e->getTraceAsString());
			$sTestMessage = $e->getMessage();
		}

		return $this->DefaultResponse(array(
			'Result' => '' === $sTestMessage,
			'Message' => \MailSo\Base\Utils::Utf8Clear($sTestMessage)
		));
	}

	public function DoAdminPasswordUpdate() : array
	{
		$this->IsAdminLoggined();

		$bResult = false;
		$oConfig = $this->Config();

		$sPassword = $this->GetActionParam('Password', '');
		$this->logMask($sPassword);

		$sNewPassword = $this->GetActionParam('newPassword', '');
		if (\strlen($sNewPassword)) {
			$this->logMask($sNewPassword);
		}

		$passfile = APP_PRIVATE_DATA.'admin_password.txt';

		if ($oConfig->ValidatePassword($sPassword)) {
			$sLogin = \trim($this->GetActionParam('Login', ''));
			if (\strlen($sLogin)) {
				$oConfig->Set('security', 'admin_login', $sLogin);
			}

			$oConfig->Set('security', 'admin_totp', $this->GetActionParam('TOTP', ''));

			if (\strlen($sNewPassword)) {
				$oConfig->SetPassword($sNewPassword);
				if (\is_file($passfile) && \trim(\file_get_contents($passfile)) !== $sNewPassword) {
					\unlink($passfile);
				}
			}

			$bResult = $oConfig->Save();
		}

		return $this->DefaultResponse($bResult
			? array('Weak' => \is_file($passfile))
			: false);
	}

	// /?admin/Backup
	public function DoAdminBackup() : void
	{
		try {
			$this->IsAdminLoggined();
			$file = \SnappyMail\Upgrade::backup();
			\header('Content-Type: application/gzip');
			\header('Content-Disposition: attachment; filename="' . \basename($file) . '"');
			\header('Content-Transfer-Encoding: binary');
			\header('Content-Length: ' . \filesize($file));
			$fp = \fopen($file, 'rb');
			\fpassthru($fp);
			\unlink($file);
		} catch (\Throwable $e) {
			if (102 == $e->getCode()) {
				\MailSo\Base\Http::StatusHeader(403);
			}
			echo $e->getMessage();
		}
		exit;
	}

	public function DoAdminInfo() : array
	{
		$this->IsAdminLoggined();

		$info = \SnappyMail\Repository::getLatestCoreInfo();

		$sVersion = empty($info->version) ? '' : $info->version;

		$bShowWarning = false;
		if (!empty($info->warnings) && !SNAPPYMAIL_DEV) {
			foreach ($info->warnings as $sWarningVersion) {
				$sWarningVersion = \trim($sWarningVersion);

				if (\version_compare(APP_VERSION, $sWarningVersion, '<')
				 && \version_compare($sVersion, $sWarningVersion, '>='))
				{
					$bShowWarning = true;
					break;
				}
			}
		}

		$aWarnings = [];
		if (!\version_compare(APP_VERSION, '2.0', '>')) {
			$aWarnings[] = APP_VERSION;
		}
		if (!\is_writable(\dirname(APP_VERSION_ROOT_PATH))) {
			$aWarnings[] = 'Can not write into: ' . \dirname(APP_VERSION_ROOT_PATH);
		}
		if (!\is_writable(APP_INDEX_ROOT_PATH . 'index.php')) {
			$aWarnings[] = 'Can not edit: ' . APP_INDEX_ROOT_PATH . 'index.php';
		}

		$aResult = [
			'system' => [
				'load' => \is_callable('sys_getloadavg') ? \sys_getloadavg() : null
			],
			'core' => [
				 'updatable' => \SnappyMail\Repository::canUpdateCore(),
				 'warning' => $bShowWarning,
				 'version' => $sVersion,
				 'versionCompare' => \version_compare(APP_VERSION, $sVersion),
				 'warnings' => $aWarnings
			],
			'php' => [
				[
					'name' => 'PHP ' . PHP_VERSION,
					'loaded' => true,
					'version' => PHP_VERSION
				],
				[
					'name' => 'PHP 64bit',
					'loaded' => PHP_INT_SIZE == 8,
					'version' => PHP_INT_SIZE
				]
			]
		];

		foreach (['APCu', 'cURL','Fileinfo','iconv','intl','LDAP','redis','Tidy','uuid','Zip'] as $name) {
			$aResult['php'][] = [
				'name' => $name,
				'loaded' => \extension_loaded(\strtolower($name)),
				'version' => \phpversion($name)
			];
		}

		$aResult['php'][] = [
			'name' => 'Phar',
			'loaded' => \class_exists('PharData'),
			'version' => \phpversion('phar')
		];

		$aResult['php'][] = [
			'name' => 'Contacts database:',
			'loaded' => \extension_loaded('pdo_mysql') || \extension_loaded('pdo_pgsql') || \extension_loaded('pdo_sqlite'),
			'version' => 0
		];
		foreach (['pdo_mysql','pdo_pgsql','pdo_sqlite'] as $name) {
			$aResult['php'][] = [
				'name' => "- {$name}",
				'loaded' => \extension_loaded(\strtolower($name)),
				'version' => \phpversion($name)
			];
		}

		$aResult['php'][] = [
			'name' => 'Crypt:',
			'loaded' => true,
			'version' => 0
		];
		foreach (['Sodium','OpenSSL','XXTEA','GnuPG'] as $name) {
			$aResult['php'][] = [
				'name' => '- ' . (('OpenSSL' === $name && \defined('OPENSSL_VERSION_TEXT')) ? OPENSSL_VERSION_TEXT : $name),
				'loaded' => \extension_loaded(\strtolower($name)),
				'version' => \phpversion($name)
			];
		}

		$aResult['php'][] = [
			'name' => 'Image processing:',
			'loaded' => \extension_loaded('gd') || \extension_loaded('gmagick') || \extension_loaded('imagick'),
			'version' => 0
		];
		foreach (['GD','Gmagick','Imagick'] as $name) {
			$aResult['php'][] = [
				'name' => "- {$name}",
				'loaded' => \extension_loaded(\strtolower($name)),
				'version' => \phpversion($name)
			];
		}

		return $this->DefaultResponse($aResult);
	}

	public function DoAdminUpgradeCore() : array
	{
		\header('Connection: close');
		return $this->DefaultResponse(\SnappyMail\Upgrade::core());
	}

	public function DoAdminQRCode() : array
	{
		$user = (string) $this->GetActionParam('username', '');
		$secret = (string) $this->GetActionParam('TOTP', '');
		$issuer = \rawurlencode(API::Config()->Get('webmail', 'title', 'SnappyMail'));
		$QR = \SnappyMail\QRCode::getMinimumQRCode(
			"otpauth://totp/{$issuer}:{$user}?secret={$secret}&issuer={$issuer}",
//			"otpauth://totp/{$user}?secret={$secret}",
			\SnappyMail\QRCode::ERROR_CORRECT_LEVEL_M
		);
		return $this->DefaultResponse($QR->__toString());
	}

/*
	public function AdminAppData(array &$aResult): void
	{
		$oConfig = $this->oConfig;
		$aResult['Auth'] = $this->IsAdminLoggined(false);
		if ($aResult['Auth']) {
			$aResult['adminLogin'] = (string)$oConfig->Get('security', 'admin_login', '');
			$aResult['adminTOTP'] = (string)$oConfig->Get('security', 'admin_totp', '');
			$aResult['pluginsEnable'] = (bool)$oConfig->Get('plugins', 'enable', false);

			$aResult['loginDefaultDomain'] = $oConfig->Get('login', 'default_domain', '');
			$aResult['determineUserLanguage'] = (bool)$oConfig->Get('login', 'determine_user_language', true);
			$aResult['determineUserDomain'] = (bool)$oConfig->Get('login', 'determine_user_domain', false);

			$aResult['supportedPdoDrivers'] = \RainLoop\Pdo\Base::getAvailableDrivers();

			$aResult['contactsEnable'] = (bool)$oConfig->Get('contacts', 'enable', false);
			$aResult['contactsSync'] = (bool)$oConfig->Get('contacts', 'allow_sync', false);
			$aResult['contactsPdoType'] = Providers\AddressBook\PdoAddressBook::validPdoType($oConfig->Get('contacts', 'type', 'sqlite'));
			$aResult['contactsPdoDsn'] = (string)$oConfig->Get('contacts', 'pdo_dsn', '');
			$aResult['contactsPdoType'] = (string)$oConfig->Get('contacts', 'type', '');
			$aResult['contactsPdoUser'] = (string)$oConfig->Get('contacts', 'pdo_user', '');
			$aResult['contactsPdoPassword'] = static::APP_DUMMY;
			$aResult['contactsMySQLSSLCA'] = (string) $oConfig->Get('contacts', 'mysql_ssl_ca', '');
			$aResult['contactsMySQLSSLVerify'] = !!$oConfig->Get('contacts', 'mysql_ssl_verify', true);
			$aResult['contactsMySQLSSLCiphers'] = (string) $oConfig->Get('contacts', 'mysql_ssl_ciphers', '');
			$aResult['contactsSQLiteGlobal'] = !!$oConfig->Get('contacts', 'sqlite_global', \is_file(APP_PRIVATE_DATA . '/AddressBook.sqlite'));
			$aResult['contactsSuggestionsLimit'] = (int)$oConfig->Get('contacts', 'suggestions_limit', 20);

			$aResult['faviconUrl'] = $oConfig->Get('webmail', 'favicon_url', '');

			$aResult['weakPassword'] = \is_file(APP_PRIVATE_DATA.'admin_password.txt');

			$aResult['System']['languagesAdmin'] = \SnappyMail\L10n::getLanguages(true);
			$aResult['languageAdmin'] = $this->ValidateLanguage($oConfig->Get('webmail', 'language_admin', 'en'), '', true);
			$aResult['languageUsers'] = $this->ValidateLanguage($this->detectUserLanguage(true), '', true, true);
		} else {
			$passfile = APP_PRIVATE_DATA.'admin_password.txt';
			$sPassword = $oConfig->Get('security', 'admin_password', '');
			if (!$sPassword) {
				$sPassword = \substr(\base64_encode(\random_bytes(16)), 0, 12);
				Utils::saveFile($passfile, $sPassword . "\n");
//				\chmod($passfile, 0600);
				$oConfig->SetPassword($sPassword);
				$oConfig->Save();
			}
		}
	}
*/

	private function setAdminAuthToken() : string
	{
		$sRand = \MailSo\Base\Utils::Sha1Rand();
		if (!$this->Cacher(null, true)->Set(KeyPathHelper::SessionAdminKey($sRand), \time())) {
			throw new \RuntimeException('Failed to store admin token');
		}
		$sToken = Utils::EncodeKeyValuesQ(array('token', $sRand));
		if (!$sToken) {
			throw new \RuntimeException('Failed to encode admin token');
		}
		\SnappyMail\Cookies::set(static::$AUTH_ADMIN_TOKEN_KEY, $sToken);
		return $sToken;
	}

	private function setConfigFromParams(Config\Application $oConfig, string $sParamName, string $sConfigSector, string $sConfigName, string $sType = 'string', ?callable $mStringCallback = null): void
	{
		if ($this->HasActionParam($sParamName)) {
			$sValue = $this->GetActionParam($sParamName, '');
			switch ($sType) {
				default:
				case 'string':
					$sValue = (string)$sValue;
					if ($mStringCallback && is_callable($mStringCallback)) {
						$sValue = $mStringCallback($sValue);
					}

					$oConfig->Set($sConfigSector, $sConfigName, $sValue);
					break;

				case 'dummy':
					$sValue = (string) $this->GetActionParam($sParamName, static::APP_DUMMY);
					if (static::APP_DUMMY !== $sValue) {
						$oConfig->Set($sConfigSector, $sConfigName, $sValue);
					}
					break;

				case 'int':
					$iValue = (int)$sValue;
					$oConfig->Set($sConfigSector, $sConfigName, $iValue);
					break;

				case 'bool':
					$oConfig->Set($sConfigSector, $sConfigName, !empty($sValue) && 'false' !== $sValue);
					break;
			}
		}
	}

}
