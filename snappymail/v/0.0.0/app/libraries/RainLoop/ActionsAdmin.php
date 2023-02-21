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

		$this->setConfigFromParams($oConfig, 'Language', 'webmail', 'language', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage, '', false);
		});

		$this->setConfigFromParams($oConfig, 'LanguageAdmin', 'webmail', 'language_admin', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage, '', true);
		});

		$this->setConfigFromParams($oConfig, 'Theme', 'webmail', 'theme', 'string', function ($sTheme) use ($self) {
			return $self->ValidateTheme($sTheme);
		});

		$this->setConfigFromParams($oConfig, 'useLocalProxyForExternalImages', 'labs', 'use_local_proxy_for_external_images', 'bool');

		$this->setConfigFromParams($oConfig, 'allowLanguagesOnSettings', 'webmail', 'allow_languages_on_settings', 'bool');
		$this->setConfigFromParams($oConfig, 'allowLanguagesOnLogin', 'login', 'allow_languages_on_login', 'bool');
		$this->setConfigFromParams($oConfig, 'AttachmentLimit', 'webmail', 'attachment_size_limit', 'int');

		$this->setConfigFromParams($oConfig, 'loginDefaultDomain', 'login', 'default_domain', 'string');

		$this->setConfigFromParams($oConfig, 'contactsEnable', 'contacts', 'enable', 'bool');
		$this->setConfigFromParams($oConfig, 'contactsSync', 'contacts', 'allow_sync', 'bool');
		$this->setConfigFromParams($oConfig, 'ContactsPdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoPassword', 'contacts', 'pdo_password', 'dummy');
		$this->setConfigFromParams($oConfig, 'ContactsSuggestionsLimit', 'contacts', 'suggestions_limit', 'int');

		$this->setConfigFromParams($oConfig, 'ContactsPdoType', 'contacts', 'type', 'string', function ($sType) use ($self) {
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

		$this->Logger()->AddSecret($sPassword);

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
		$this->setConfigFromParams($oConfig, 'ContactsPdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoPassword', 'contacts', 'pdo_password', 'dummy');
		$this->setConfigFromParams($oConfig, 'ContactsPdoType', 'contacts', 'type', 'string', function ($sType) {
			return Providers\AddressBook\PdoAddressBook::validPdoType($sType);
		});

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
		$this->Logger()->AddSecret($sPassword);

		$sNewPassword = $this->GetActionParam('newPassword', '');
		if (\strlen($sNewPassword)) {
			$this->Logger()->AddSecret($sNewPassword);
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

		foreach (['APCu', 'cURL','GnuPG','GD','Gmagick','Imagick','iconv','intl','LDAP','OpenSSL','pdo_mysql','pdo_pgsql','pdo_sqlite','redis','Sodium','Tidy','uuid','XXTEA','Zip'] as $name) {
			$aResult['php'][] = [
				'name' => ('OpenSSL' === $name && \defined('OPENSSL_VERSION_TEXT')) ? OPENSSL_VERSION_TEXT : $name,
				'loaded' => \extension_loaded(\strtolower($name)),
				'version' => \phpversion($name)
			];
		}
		$aResult['php'][] = [
			'name' => 'Fileinfo',
			'loaded' => \class_exists('finfo'),
			'version' => \phpversion('fileinfo')
		];
		$aResult['php'][] = [
			'name' => 'Phar',
			'loaded' => \class_exists('PharData'),
			'version' => \phpversion('phar')
		];

		return $this->DefaultResponse($aResult);
	}

	public function DoAdminUpgradeCore() : array
	{
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
