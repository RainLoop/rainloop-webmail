<?php

namespace OCA\SnappyMail\Util;

class SnappyMailHelper
{

	public static function loadApp() : void
	{
		if (\class_exists('RainLoop\\Api')) {
			return;
		}

		// ownCloud the default spl_autoload_register() not working
		\spl_autoload_register(function($sClassName){
			$file = SNAPPYMAIL_LIBRARIES_PATH . \strtolower(\strtr($sClassName, '\\', DIRECTORY_SEPARATOR)) . '.php';
			if (\is_file($file)) {
				include_once $file;
			}
		});

		$_ENV['SNAPPYMAIL_OWNCLOUD'] = true; // Obsolete
		$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;

//		define('APP_VERSION', '0.0.0');
//		define('APP_INDEX_ROOT_PATH', __DIR__ . DIRECTORY_SEPARATOR);
//		include APP_INDEX_ROOT_PATH.'snappymail/v/'.APP_VERSION.'/include.php';
//		define('APP_DATA_FOLDER_PATH', \rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/').'/appdata_snappymail/');

		$app_dir = \dirname(\dirname(__DIR__)) . '/app';
		require_once $app_dir . '/index.php';

		// https://github.com/the-djmaze/snappymail/issues/790#issuecomment-1366527884
		if (!file_exists($app_dir . '/.htaccess') && file_exists($app_dir . '/_htaccess')) {
			rename($app_dir . '/_htaccess', $app_dir . '/.htaccess');
			if (!file_exists(APP_VERSION_ROOT_PATH . '/app/.htaccess') && file_exists(APP_VERSION_ROOT_PATH . '/app/_htaccess')) {
				rename(APP_VERSION_ROOT_PATH . '/app/_htaccess', APP_VERSION_ROOT_PATH . '/app/.htaccess');
			}
			if (!file_exists(APP_VERSION_ROOT_PATH . '/static/.htaccess') && file_exists(APP_VERSION_ROOT_PATH . '/static/_htaccess')) {
				rename(APP_VERSION_ROOT_PATH . '/static/_htaccess', APP_VERSION_ROOT_PATH . '/static/.htaccess');
			}
		}

		$oConfig = \RainLoop\Api::Config();
		$bSave = false;

		if (!$oConfig->Get('webmail', 'app_path')) {
			$oConfig->Set('webmail', 'app_path', \OC::$server->getAppManager()->getAppWebPath('snappymail') . '/app/');
			$bSave = true;
		}

		if (!\is_dir(APP_PLUGINS_PATH . 'owncloud')) {
			\SnappyMail\Repository::installPackage('plugin', 'owncloud');
			$oConfig->Set('plugins', 'enable', true);
			$aList = \SnappyMail\Repository::getEnabledPackagesNames();
			$aList[] = 'owncloud';
			$oConfig->Set('plugins', 'enabled_list', \implode(',', \array_unique($aList)));
//			$oConfig->Set('webmail', 'theme', 'ownCloud@custom');
			$bSave = true;
		}

		$sPassword = $oConfig->Get('security', 'admin_password');
		if ('12345' == $sPassword || !$sPassword) {
			$sPassword = \substr(\base64_encode(\random_bytes(16)), 0, 12);
			$oConfig->SetPassword($sPassword);
			\RainLoop\Utils::saveFile(APP_PRIVATE_DATA . 'admin_password.txt', $sPassword . "\n");
			$bSave = true;
		}

		// Pre-configure domain
		$ocConfig = \OC::$server->getConfig();
		if ($ocConfig->getAppValue('snappymail', 'snappymail-autologin', false)
		 || $ocConfig->getAppValue('snappymail', 'snappymail-autologin-with-email', false)
		) {
			$oProvider = \RainLoop\Api::Actions()->DomainProvider();
			$oDomain = $oProvider->Load('owncloud');
			if (!$oDomain) {
//				$oDomain = \RainLoop\Model\Domain::fromIniArray('owncloud', []);
				$oDomain = new \RainLoop\Model\Domain('owncloud');
				$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::NONE;
				$oDomain->SetConfig(
					'localhost', 143, $iSecurityType, true,
					true, 'localhost', 4190, $iSecurityType,
					'localhost', 25, $iSecurityType, true, true, false, false,
					'');
				$oProvider->Save($oDomain);
				if (!$oConfig->Get('login', 'default_domain', '')) {
					$oConfig->Set('login', 'default_domain', 'owncloud');
					$bSave = true;
				}
			}
		}

		$bSave && $oConfig->Save();
	}

	public static function startApp(bool $handle = false) : void
	{
		static::loadApp();

		try {
			$oActions = \RainLoop\Api::Actions();
			$oConfig = \RainLoop\Api::Config();
			if (isset($_GET[$oConfig->Get('security', 'admin_panel_key', 'admin')])) {
				if ($oConfig->Get('security', 'allow_admin_panel', true)
				 && \OC_User::isAdminUser(\OC::$server->getUserSession()->getUser()->getUID())
				 && !$oActions->IsAdminLoggined(false)
				) {
					$sRand = \MailSo\Base\Utils::Sha1Rand();
					if ($oActions->Cacher(null, true)->Set(\RainLoop\KeyPathHelper::SessionAdminKey($sRand), \time())) {
						$sToken = \RainLoop\Utils::EncodeKeyValuesQ(array('token', $sRand));
//						$oActions->setAdminAuthToken($sToken);
						\RainLoop\Utils::SetCookie('smadmin', $sToken);
					}
				}
			} else {
				$doLogin = !$oActions->getMainAccountFromToken(false);
				$aCredentials = static::getLoginCredentials();
/*
				// NC25+ workaround for Impersonate plugin
				// https://github.com/the-djmaze/snappymail/issues/561#issuecomment-1301317723
				// https://github.com/nextcloud/server/issues/34935#issuecomment-1302145157
				require \OC::$SERVERROOT . '/version.php';
//				\OC\SystemConfig
//				file_get_contents(\OC::$SERVERROOT . 'config/config.php');
//				$CONFIG['version']
				if (24 < $OC_Version[0]) {
					$ocSession = \OC::$server->getSession();
					$ocSession->reopen();
					if (!$doLogin && $ocSession['snappymail-uid'] && $ocSession['snappymail-uid'] != $aCredentials[0]) {
						// UID changed, Impersonate plugin probably active
						$oActions->Logout(true);
						$doLogin = true;
					}
					$ocSession->set('snappymail-uid', $aCredentials[0]);
				}
*/
				if ($doLogin && $aCredentials[1] && $aCredentials[2]) {
					$oActions->Logger()->AddSecret($aCredentials[2]);
					$oAccount = $oActions->LoginProcess($aCredentials[1], $aCredentials[2], false);
					if ($oAccount) {
						$oActions->Plugins()->RunHook('login.success', array($oAccount));
						$oActions->SetAuthToken($oAccount);
					}
				}
			}
		} catch (\Throwable $e) {
			// Ignore login failure
		}

		if ($handle) {
			\header_remove('Content-Security-Policy');
			\RainLoop\Service::Handle();
			exit;
		}
	}

	public static function getLoginCredentials() : array
	{
		$sEmail = '';
		$sPassword = '';
		$config = \OC::$server->getConfig();
		$sUID = \OC::$server->getUserSession()->getUser()->getUID();
		$ocSession = \OC::$server->getSession();
		// Only use the user's password in the current session if they have
		// enabled auto-login using ownCloud username or email address.
		if ($ocSession['snappymail-nc-uid'] == $sUID) {
			if ($config->getAppValue('snappymail', 'snappymail-autologin', false)) {
				$sEmail = $sUID;
				$sPassword = $ocSession['snappymail-password'];
			} else if ($config->getAppValue('snappymail', 'snappymail-autologin-with-email', false)) {
				$sEmail = $config->getUserValue($sUID, 'settings', 'email', '');
				$sPassword = $ocSession['snappymail-password'];
			}
			if ($sPassword) {
				$sPassword = static::decodePassword($sPassword, $sUID);
			}
		}

		// If the user has set credentials for SnappyMail in their personal
		// settings, override everything before and use those instead.
		$sCustomEmail = $config->getUserValue($sUID, 'snappymail', 'snappymail-email', '');
		if ($sCustomEmail) {
			$sEmail = $sCustomEmail;
			$sPassword = $config->getUserValue($sUID, 'snappymail', 'snappymail-password', '');
			if ($sPassword) {
				$sPassword = static::decodePassword($sPassword, \md5($sEmail));
			}
		}
		return [$sUID, $sEmail, $sPassword ?: ''];
	}

	public static function getAppUrl() : string
	{
		return \OC::$server->getURLGenerator()->linkToRoute('snappymail.page.appGet');
	}

	public static function normalizeUrl(string $sUrl) : string
	{
		$sUrl = \rtrim(\trim($sUrl), '/\\');
		if ('.php' !== \strtolower(\substr($sUrl, -4))) {
			$sUrl .= '/';
		}

		return $sUrl;
	}

	public static function encodePassword(string $sPassword, string $sSalt) : string
	{
		static::loadApp();
		return \SnappyMail\Crypt::EncryptUrlSafe($sPassword, $sSalt);
	}

	public static function decodePassword(string $sPassword, string $sSalt)/* : mixed */
	{
		static::loadApp();
		return \SnappyMail\Crypt::DecryptUrlSafe($sPassword, $sSalt);
	}

	// Imports data from RainLoop
	public static function importRainLoop() : array
	{
		$result = [];

		$dir = \rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/');
		$dir_snappy = $dir . '/appdata_snappymail/';
		$dir_rainloop = $dir . '/rainloop-storage';
		$rainloop_plugins = [];
		if (\is_dir($dir_rainloop)) {
			\is_dir($dir_snappy) || \mkdir($dir_snappy, 0755, true);
			$iterator = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator($dir_rainloop, \RecursiveDirectoryIterator::SKIP_DOTS),
				\RecursiveIteratorIterator::SELF_FIRST
			);
			foreach ($iterator as $item) {
				$target = $dir_snappy . $iterator->getSubPathname();
				if (\preg_match('@/plugins/([^/])@', $target, $match)) {
					$rainloop_plugins[$match[1]] = $match[1];
				} else if (!\strpos($target, '/cache/')) {
					if ($item->isDir()) {
						\is_dir($target) || \mkdir($target, 0755, true);
					} else if (\file_exists($target)) {
						$result[] = "skipped: {$target}";
					} else {
						\copy($item, $target);
						$result[] = "copied : {$target}";
					}
				}
			}
		}

//		$password = APP_PRIVATE_DATA . 'admin_password.txt';
//		\is_file($password) && \unlink($password);

		static::loadApp();

		// Attempt to install same plugins as RainLoop
		if ($rainloop_plugins) {
			foreach (\SnappyMail\Repository::getPackagesList()['List'] as $plugin) {
				if (\in_array($plugin['id'], $rainloop_plugins)) {
					$result[] = "install plugin : {$plugin['id']}";
					\SnappyMail\Repository::installPackage('plugin', $plugin['id']);
					unset($rainloop_plugins[$plugin['id']]);
				}
			}
			foreach ($rainloop_plugins as $plugin) {
				$result[] = "skipped plugin : {$plugin}";
			}
		}

		$oConfig = \RainLoop\Api::Config();
//		$oConfig->Set('webmail', 'theme', 'ownCloud@custom');
		$oConfig->Save();

		return $result;
	}

}
