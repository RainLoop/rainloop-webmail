<?php

namespace OCA\SnappyMail\Util;

class SnappyMailHelper
{

	public static function loadApp() : void
	{
		if (\class_exists('RainLoop\\Api')) {
			return;
		}

		// Nextcloud the default spl_autoload_register() not working
		\spl_autoload_register(function($sClassName){
			$file = RAINLOOP_APP_LIBRARIES_PATH . \strtolower(\strtr($sClassName, '\\', DIRECTORY_SEPARATOR)) . '.php';
			if (\is_file($file)) {
				include_once $file;
			}
		});

		$_ENV['SNAPPYMAIL_NEXTCLOUD'] = true;
		$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;

		require_once \dirname(\dirname(__DIR__)) . '/app/index.php';

		$oConfig = \RainLoop\Api::Config();
		$bSave = false;

		if (!$oConfig->Get('webmail', 'app_path')) {
			$oConfig->Set('webmail', 'app_path', \OC::$server->getAppManager()->getAppWebPath('snappymail') . '/app/');
			$bSave = true;
		}

		if (!\is_dir(APP_PLUGINS_PATH . 'nextcloud')) {
			\SnappyMail\Repository::installPackage('plugin', 'nextcloud');
			$oConfig->Set('plugins', 'enable', true);
			$aList = \SnappyMail\Repository::getEnabledPackagesNames();
			$aList[] = 'nextcloud';
			$oConfig->Set('plugins', 'enabled_list', \implode(',', \array_unique($aList)));
			$oConfig->Set('webmail', 'theme', 'Nextcloud@custom');
			$bSave = true;
		}

		$sPassword = $oConfig->Get('security', 'admin_password');
		if ('12345' == $sPassword || !$sPassword) {
			$sPassword = \substr(\base64_encode(\random_bytes(16)), 0, 12);
			$oConfig->SetPassword($sPassword);
			\RainLoop\Utils::saveFile(APP_PRIVATE_DATA . 'admin_password.txt', $sPassword . "\n");
			$bSave = true;
		}

		// Pre-configure some domains
		$ocConfig = \OC::$server->getConfig();
		if ($ocConfig->getAppValue('snappymail', 'snappymail-autologin', false)
		 || $ocConfig->getAppValue('snappymail', 'snappymail-autologin-with-email', false)
		) {
			$aDomains = \array_unique([
				'nextcloud',
				\preg_replace('/:\d+$/','',$_SERVER['HTTP_HOST']),
				$_SERVER['SERVER_NAME'],
				\gethostname()
			]);
			foreach ($aDomains as $i => $sDomain) {
				if ($sDomain) {
					$oProvider = \RainLoop\Api::Actions()->DomainProvider();
					$oDomain = $oProvider->Load($sDomain);
					if (!($oDomain instanceof \RainLoop\Model\Domain)) {
						$oDomain = new \RainLoop\Model\Domain($sDomain);
						$bShortLogin = !$i;
						$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::NONE;
						$oDomain->SetConfig(
							'localhost', 143, $iSecurityType, $bShortLogin,
							true, 'localhost', 4190, $iSecurityType,
							'localhost', 25, $iSecurityType, $bShortLogin, true, false, false,
							'');
						$oProvider->Save($oDomain);
						if (!$oConfig->Get('login', 'default_domain', '')) {
							$oConfig->Set('login', 'default_domain', 'nextcloud');
							$bSave = true;
						}
					}
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
				$aCredentials = SnappyMailHelper::getLoginCredentials();
				if ($oActions->getMainAccountFromToken(false)) {
					if (!$aCredentials[0] || !$aCredentials[1]) {
						$oActions->Logout(true);
					}
				} else if ($aCredentials[0] && $aCredentials[1]) {
					$oActions->Logger()->AddSecret($aCredentials[1]);
					$oAccount = $oActions->LoginProcess($aCredentials[0], $aCredentials[1], false);
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
		// Only store the user's password in the current session if they have
		// enabled auto-login using Nextcloud username or email address.
		if ($config->getAppValue('snappymail', 'snappymail-autologin', false)) {
			$sEmail = $sUID;
			$sPassword = \OC::$server->getSession()['snappymail-password'];
		} else if ($config->getAppValue('snappymail', 'snappymail-autologin-with-email', false)) {
			$sEmail = $config->getUserValue($sUID, 'settings', 'email', '');
			$sPassword = \OC::$server->getSession()['snappymail-password'];
		}
		if (\OC::$server->getSession()['snappymail-email'] != $sEmail) {
			$sPassword = '';
		}

		// If the user has set credentials for SnappyMail in their personal
		// settings, override everything before and use those instead.
		$sCustomEmail = $config->getUserValue($sUID, 'snappymail', 'snappymail-email', '');
		if ($sCustomEmail) {
			$sEmail = $sCustomEmail;
			$sPassword = $config->getUserValue($sUID, 'snappymail', 'snappymail-password', '');
		}
		return [$sEmail, $sPassword ? SnappyMailHelper::decodePassword($sPassword, \md5($sEmail)) : ''];
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
		$oConfig->Set('webmail', 'theme', 'Nextcloud@custom');
		$oConfig->Save();

		return $result;
	}

}
