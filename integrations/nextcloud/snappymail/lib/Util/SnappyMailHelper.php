<?php

namespace OCA\SnappyMail\Util;

class SnappyMailResponse extends \OCP\AppFramework\Http\Response
{
    public function render(): string
    {
		$data = '';
		$i = \ob_get_level();
		while ($i--) {
			$data .= \ob_get_clean();
		}
		return $data;
    }
}

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

		$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;

//		define('APP_VERSION', '0.0.0');
//		define('APP_INDEX_ROOT_PATH', __DIR__ . DIRECTORY_SEPARATOR);
//		include APP_INDEX_ROOT_PATH.'snappymail/v/'.APP_VERSION.'/include.php';
//		define('APP_DATA_FOLDER_PATH', \rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/').'/appdata_snappymail/');

		$app_dir = \dirname(\dirname(__DIR__)) . '/app';
		require_once $app_dir . '/index.php';
	}

	public static function startApp(bool $handle = false)
	{
		static::loadApp();

		$oConfig = \RainLoop\Api::Config();

		if (false !== \stripos(\php_sapi_name(), 'cli')) {
			return;
		}

		try {
			$oActions = \RainLoop\Api::Actions();
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
						$oAccount = $oActions->LoginProcess($aCredentials[1], $aCredentials[2]);
						if ($oAccount) {
							// Must be here due to bug #1241
							$oActions->SetMainAuthAccount($oAccount);
							$oActions->Plugins()->RunHook('login.success', array($oAccount));

							$oActions->SetAuthToken($oAccount);
							if ($oConfig->Get('login', 'sign_me_auto', \RainLoop\Enumerations\SignMeType::DEFAULT_OFF) === \RainLoop\Enumerations\SignMeType::DEFAULT_ON) {
								$oActions->SetSignMeToken($oAccount);
							}
						}
					} catch (\Throwable $e) {
						// Login failure, reset password to prevent more attempts
						$sUID = \OC::$server->getUserSession()->getUser()->getUID();
						\OC::$server->getSession()['snappymail-password'] = '';
						\OC::$server->getConfig()->setUserValue($sUID, 'snappymail', 'snappymail-password', '');
					}
				}
			}

			if ($handle) {
				\header_remove('Content-Security-Policy');
				\RainLoop\Service::Handle();
				// https://github.com/the-djmaze/snappymail/issues/1069
				exit;
//				return new SnappyMailResponse();
			}
		} catch (\Throwable $e) {
			// Ignore login failure
		}
	}

	private static function getLoginCredentials() : array
	{
		$sUID = \OC::$server->getUserSession()->getUser()->getUID();
		$config = \OC::$server->getConfig();
		$ocSession = \OC::$server->getSession();

		// If the user has set credentials for SnappyMail in their personal settings,
		// this has the first priority.
		$sEmail = $config->getUserValue($sUID, 'snappymail', 'snappymail-email');
		$sPassword = $config->getUserValue($sUID, 'snappymail', 'snappymail-password');
		if ($sEmail && $sPassword) {
			$sPassword = static::decodePassword($sPassword, \md5($sEmail));
			if ($sPassword) {
				return [$sUID, $sEmail, $sPassword];
			}
		}

		// If the current user ID is identical to login ID (not valid when using account switching),
		// this has the second priority.
		if ($ocSession['snappymail-nc-uid'] == $sUID) {
/*
			// If OpenID Connect (OIDC) is enabled and used for login, use this.
			// https://apps.nextcloud.com/apps/oidc_login
			// DISABLED https://github.com/the-djmaze/snappymail/issues/1420#issuecomment-1933045917
			if ($config->getAppValue('snappymail', 'snappymail-autologin-oidc', false)) {
				if ($ocSession->get('is_oidc')) {
					// IToken->getPassword() ???
					if ($sAccessToken = $ocSession->get('oidc_access_token')) {
						return [$sUID, 'oidc@nextcloud', $sAccessToken];
					}
					\SnappyMail\Log::debug('Nextcloud', 'OIDC access_token missing');
				} else {
					\SnappyMail\Log::debug('Nextcloud', 'No OIDC login');
				}
			}
*/
			// Only use the user's password in the current session if they have
			// enabled auto-login using Nextcloud username or email address.
			$sEmail = '';
			$sPassword = '';
			if ($config->getAppValue('snappymail', 'snappymail-autologin', false)) {
				$sEmail = $sUID;
				$sPassword = $ocSession['snappymail-password'];
			} else if ($config->getAppValue('snappymail', 'snappymail-autologin-with-email', false)) {
				$sEmail = $config->getUserValue($sUID, 'settings', 'email');
				$sPassword = $ocSession['snappymail-password'];
			} else {
				\SnappyMail\Log::debug('Nextcloud', 'snappymail-autologin is off');
			}
			if ($sPassword) {
				return [$sUID, $sEmail, static::decodePassword($sPassword, $sUID)];
			}
		}

		return [$sUID, '', ''];
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
