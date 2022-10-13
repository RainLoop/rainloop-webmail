<?php

namespace OCA\SnappyMail\Util;

class SnappyMailHelper
{

	public static function startApp(bool $api = false)
	{
		if (!\class_exists('RainLoop\\Api')) {
			$_ENV['SNAPPYMAIL_NEXTCLOUD'] = true;

			// Nextcloud the default spl_autoload_register() not working
			\spl_autoload_register(function($sClassName){
				$file = RAINLOOP_APP_LIBRARIES_PATH . \strtolower(\strtr($sClassName, '\\', DIRECTORY_SEPARATOR)) . '.php';
				if (is_file($file)) {
					include_once $file;
				}
			});

			if ($api) {
				$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
			}

			require_once \dirname(\dirname(__DIR__)) . '/app/index.php';

			if ($api) {
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
		}
	}

	/**
	 * @return string
	 */
	public static function getAppUrl()
	{
		return \OC::$server->getURLGenerator()->linkToRoute('snappymail.page.appGet');
	}

	/**
	 * @param string $sUrl
	 *
	 * @return string
	 */
	public static function normalizeUrl($sUrl)
	{
		$sUrl = \rtrim(\trim($sUrl), '/\\');
		if ('.php' !== \strtolower(\substr($sUrl, -4))) {
			$sUrl .= '/';
		}

		return $sUrl;
	}

	/**
	 * @param string $sPassword
	 * @param string $sSalt
	 *
	 * @return string
	 */
	public static function encodePassword($sPassword, $sSalt)
	{
		static::startApp(true);
		return \SnappyMail\Crypt::EncryptUrlSafe($sPassword, $sSalt);
	}

	/**
	 * @param string $sPassword
	 * @param string $sSalt
	 *
	 * @return string
	 */
	public static function decodePassword($sPassword, $sSalt)
	{
		static::startApp(true);
		return \SnappyMail\Crypt::DecryptUrlSafe($sPassword, $sSalt);
	}
}
