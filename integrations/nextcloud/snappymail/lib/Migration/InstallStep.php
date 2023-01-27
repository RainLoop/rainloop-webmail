<?php
// https://docs.nextcloud.com/server/19/developer_manual/app/repair.html
namespace OCA\SnappyMail\Migration;

use OCP\Migration\IOutput;
use OCP\Migration\IRepairStep;
use OCP\ILogger;

/**
 * Note: this is not run at install, but when:
 * - app is enabled in Admin -> Settings -> Apps
 * - after upgrade
 */
class InstallStep implements IRepairStep
{
	public function getName() {
		return 'Setup SnappyMail';
	}

	public function run(IOutput $output) {

		\clearstatcache();
		\clearstatcache(true);
		// opcache_reset is a terrible solution, but certain Nextcloud setups have issues
		\is_callable('opcache_reset') && \opcache_reset();

		\OCA\SnappyMail\Util\SnappyMailHelper::loadApp();

		$app_dir = \dirname(\dirname(__DIR__)) . '/app';

		// https://github.com/the-djmaze/snappymail/issues/790#issuecomment-1366527884
		if (!\file_exists($app_dir . '/.htaccess') && \file_exists($app_dir . '/_htaccess')) {
			\rename($app_dir . '/_htaccess', $app_dir . '/.htaccess');
		}
		if (!\file_exists(APP_VERSION_ROOT_PATH . 'app/.htaccess') && \file_exists(APP_VERSION_ROOT_PATH . 'app/_htaccess')) {
			\rename(APP_VERSION_ROOT_PATH . 'app/_htaccess', APP_VERSION_ROOT_PATH . 'app/.htaccess');
		}
		if (!\file_exists(APP_VERSION_ROOT_PATH . 'static/.htaccess') && \file_exists(APP_VERSION_ROOT_PATH . 'static/_htaccess')) {
			\rename(APP_VERSION_ROOT_PATH . 'static/_htaccess', APP_VERSION_ROOT_PATH . 'static/.htaccess');
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
		$oProvider = \RainLoop\Api::Actions()->DomainProvider();
		$oDomain = $oProvider->Load('nextcloud');
		if (!$oDomain) {
//			$oDomain = \RainLoop\Model\Domain::fromIniArray('nextcloud', []);
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

		$bSave && $oConfig->Save();
	}
}
