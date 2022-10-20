<?php

namespace OCA\SnappyMail\Util;

class SnappyMailHelper
{

	public static function loadApp() : void
	{
		if (!\class_exists('RainLoop\\Api')) {
			// Nextcloud the default spl_autoload_register() not working
			\spl_autoload_register(function($sClassName){
				$file = RAINLOOP_APP_LIBRARIES_PATH . \strtolower(\strtr($sClassName, '\\', DIRECTORY_SEPARATOR)) . '.php';
				if (is_file($file)) {
					include_once $file;
				}
			});

			$_ENV['SNAPPYMAIL_NEXTCLOUD'] = true;
			$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;

			require_once \dirname(\dirname(__DIR__)) . '/app/index.php';
		}

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
		$bSave && $oConfig->Save();
	}

	public static function startApp(bool $handle = false) : void
	{
		static::loadApp();

		try {
			$oActions = \RainLoop\Api::Actions();
			if (!$oActions->getMainAccountFromToken(false)) {
				$aCredentials = SnappyMailHelper::getLoginCredentials();
				if ($aCredentials[0] && $aCredentials[1]) {
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

	public static function importRainloop() : bool
	{
		$dir = \rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/');

		$dir_snappy = $dir . '/appdata_snappymail/';
		\is_dir($dir_snappy) || \mkdir($dir);

		$dir_rainloop = $dir . '/rainloop-storage';
		if (\is_dir($dir_rainloop)) {
			$plugins = [];
			$iterator = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator($dir_rainloop, \RecursiveDirectoryIterator::SKIP_DOTS),
				\RecursiveIteratorIterator::SELF_FIRST
			);
			foreach ($iterator as $item) {
				$target = $dir_snappy . DIRECTORY_SEPARATOR . $iterator->getSubPathname();
				if (\preg_match('@/plugins/([^/])@', $target, $match)) {
					$plugins[$match[1]] = $match[1];
				} else if (!\strpos($target, '/cache/')) {
					if ($item->isDir()) {
						\mkdir($target);
					} else {
						\copy($item, $target);
					}
				}
			}

			static::loadApp();
			foreach (\SnappyMail\Repository::getPackagesList()['List'] as $plugin) {
				if (\in_array($plugin['id'], $plugins)) {
					\SnappyMail\Repository::installPackage('plugin', $plugin['id']);
				}
			}

			return true;
		}
		return false;
	}
}
