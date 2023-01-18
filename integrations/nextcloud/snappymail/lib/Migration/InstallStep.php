<?php
// https://docs.nextcloud.com/server/19/developer_manual/app/repair.html
namespace OCA\SnappyMail\Migration;

use OCP\Migration\IOutput;
use OCP\Migration\IRepairStep;
use OCP\ILogger;

class InstallStep implements IRepairStep
{
	public function getName() {
		return 'Setup SnappyMail';
	}

	public function run(IOutput $output) {
		$_ENV['SNAPPYMAIL_NEXTCLOUD'] = true; // Obsolete
		$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;

//		define('APP_VERSION', '0.0.0');
//		define('APP_INDEX_ROOT_PATH', __DIR__ . DIRECTORY_SEPARATOR);
//		include APP_INDEX_ROOT_PATH.'snappymail/v/'.APP_VERSION.'/include.php';
//		define('APP_DATA_FOLDER_PATH', \rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/').'/appdata_snappymail/');

		$app_dir = \dirname(\dirname(__DIR__)) . '/app';

		if (!\class_exists('RainLoop\\Api')) {
			// Nextcloud the default spl_autoload_register() not working
			\spl_autoload_register(function($sClassName){
				$file = SNAPPYMAIL_LIBRARIES_PATH . \strtolower(\strtr($sClassName, '\\', DIRECTORY_SEPARATOR)) . '.php';
				if (\is_file($file)) {
					include_once $file;
				}
			});
			require_once $app_dir . '/index.php';
		}

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

		// Pre-configure domain
		$ocConfig = \OC::$server->getConfig();
		if ($ocConfig->getAppValue('snappymail', 'snappymail-autologin', false)
		 || $ocConfig->getAppValue('snappymail', 'snappymail-autologin-with-email', false)
		) {
			$oProvider = \RainLoop\Api::Actions()->DomainProvider();
			$oDomain = $oProvider->Load('nextcloud');
			if (!$oDomain) {
//				$oDomain = \RainLoop\Model\Domain::fromIniArray('nextcloud', []);
				$oDomain = new \RainLoop\Model\Domain('nextcloud');
				$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::NONE;
				$oDomain->SetConfig(
					'localhost', 143, $iSecurityType, true,
					true, 'localhost', 4190, $iSecurityType,
					'localhost', 25, $iSecurityType, true, true, false, false,
					'');
				$oProvider->Save($oDomain);
				if (!$oConfig->Get('login', 'default_domain', '')) {
					$oConfig->Set('login', 'default_domain', 'nextcloud');
					$bSave = true;
				}
			}
		}

		$bSave && $oConfig->Save();
	}
}
