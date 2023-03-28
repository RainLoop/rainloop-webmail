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
			$file = SNAPPYMAIL_LIBRARIES_PATH . \strtolower(\strtr($sClassName, '\\', DIRECTORY_SEPARATOR)) . '.php';
			if (\is_file($file)) {
				include_once $file;
			}
		});

		$_ENV['SNAPPYMAIL_NEXTCLOUD'] = true; // Obsolete
		$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;

//		define('APP_VERSION', '0.0.0');
//		define('APP_INDEX_ROOT_PATH', __DIR__ . DIRECTORY_SEPARATOR);
//		include APP_INDEX_ROOT_PATH.'snappymail/v/'.APP_VERSION.'/include.php';
//		define('APP_DATA_FOLDER_PATH', \rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/').'/appdata_snappymail/');

		$app_dir = \dirname(\dirname(__DIR__)) . '/app';
		require_once $app_dir . '/index.php';
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
						\SnappyMail\Cookies::set('smadmin', $sToken);
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
					try {
						$oActions->Logger()->AddSecret($aCredentials[2]);
						$oAccount = $oActions->LoginProcess($aCredentials[1], $aCredentials[2], false);
						if ($oAccount) {
							$oActions->Plugins()->RunHook('login.success', array($oAccount));
							$oActions->SetAuthToken($oAccount);
						}
					} catch (\Throwable $e) {
						// Login failure, reset password to prevent more attempts
						$sUID = \OC::$server->getUserSession()->getUser()->getUID();
						\OC::$server->getSession()['snappymail-password'] = '';
						\OC::$server->getConfig()->setUserValue($sUID, 'snappymail', 'snappymail-password', '');
					}
				}
			}
		} catch (\Throwable $e) {
			// Ignore login failure
		}

		if ($handle) {
			\header_remove('Content-Security-Policy');
			\RainLoop\Service::Handle();
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
		// enabled auto-login using Nextcloud username or email address.
		if ($ocSession['snappymail-nc-uid'] == $sUID) {
			if ($config->getAppValue('snappymail', 'snappymail-autologin', false)) {
				$sEmail = $sUID;
				$sPassword = $ocSession['snappymail-password'];
			} else if ($config->getAppValue('snappymail', 'snappymail-autologin-with-email', false)) {
				$sEmail = $config->getUserValue($sUID, 'settings', 'email');
				$sPassword = $ocSession['snappymail-password'];
			}
			if ($sPassword) {
				$sPassword = static::decodePassword($sPassword, $sUID);
			}
		}

		// If the user has set credentials for SnappyMail in their personal
		// settings, override everything before and use those instead.
		$sCustomEmail = $config->getUserValue($sUID, 'snappymail', 'snappymail-email');
		if ($sCustomEmail) {
			$sEmail = $sCustomEmail;
			$sPassword = $config->getUserValue($sUID, 'snappymail', 'snappymail-password');
			if ($sPassword) {
				$sPassword = static::decodePassword($sPassword, \md5($sEmail));
			}
		} else if ($aRainLoop = RainLoop::getLoginCredentials($sUID, $config)) {
			$sEmail = $aRainLoop[0];
			$config->setUserValue($sUID, 'snappymail', 'snappymail-email', $sEmail);
			if ($aRainLoop[1]) {
				$config->setUserValue($sUID, 'snappymail', 'snappymail-password', static::encodePassword($aRainLoop[1], \md5($sEmail)));
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
}
