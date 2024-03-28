<?php
// https://docs.nextcloud.com/server/19/developer_manual/app/repair.html
namespace OCA\SnappyMail\Migration;

use OCA\SnappyMail\AppInfo\Application;
use OCP\IConfig;
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

		$output->info('clearstatcache');
		\clearstatcache();
		\clearstatcache(true);
		$output->info('opcache_reset');
		// opcache_reset is a terrible solution, but certain Nextcloud setups have issues
		\is_callable('opcache_reset') && \opcache_reset();

		$output->info('Load App');
		\OCA\SnappyMail\Util\SnappyMailHelper::loadApp();

		$output->info('Fix permissions');
		\SnappyMail\Upgrade::fixPermissions();

		$app_dir = \dirname(\dirname(__DIR__)) . '/app';
//		$app_dir = \rtrim(APP_INDEX_ROOT_PATH, '\\/');

		// https://github.com/the-djmaze/snappymail/issues/790#issuecomment-1366527884
		if (!\file_exists($app_dir . '/.htaccess') && \file_exists($app_dir . '/_htaccess')) {
			\rename($app_dir . '/_htaccess', $app_dir . '/.htaccess');
		}
		if (!\file_exists(APP_VERSION_ROOT_PATH . 'app/.htaccess') && \file_exists(APP_VERSION_ROOT_PATH . 'app/_htaccess')) {
			\rename(APP_VERSION_ROOT_PATH . 'app/_htaccess', APP_VERSION_ROOT_PATH . 'app/.htaccess');
		}
//		if (!\file_exists(APP_VERSION_ROOT_PATH . 'static/.htaccess') && \file_exists(APP_VERSION_ROOT_PATH . 'static/_htaccess')) {
//			\rename(APP_VERSION_ROOT_PATH . 'static/_htaccess', APP_VERSION_ROOT_PATH . 'static/.htaccess');
//		}

		$oConfig = \RainLoop\Api::Config();
		$bSave = false;

		if (!$oConfig->Get('webmail', 'app_path')) {
			$output->info('Set config [webmail]app_path');
			$oConfig->Set('webmail', 'app_path', \OC::$server->getAppManager()->getAppWebPath('snappymail') . '/app/');
			$bSave = true;
		}

		if (!\is_dir(APP_PLUGINS_PATH . 'nextcloud')) {
			$output->info('Install extension: nextcloud');
			\SnappyMail\Repository::installPackage('plugin', 'nextcloud');
			$oConfig->Set('plugins', 'enable', true);
			$aList = \SnappyMail\Repository::getEnabledPackagesNames();
			$aList[] = 'nextcloud';
			$oConfig->Set('plugins', 'enabled_list', \implode(',', \array_unique($aList)));
			$oConfig->Set('webmail', 'theme', 'NextcloudV25+');
			$bSave = true;
		}

		$sPassword = $oConfig->Get('security', 'admin_password');
		if ('12345' == $sPassword || !$sPassword) {
			$output->info('Generate admin password');
			$sPassword = \substr(\base64_encode(\random_bytes(16)), 0, 12);
			$oConfig->SetPassword(new \SnappyMail\SensitiveString($sPassword));
			\RainLoop\Utils::saveFile(APP_PRIVATE_DATA . 'admin_password.txt', $sPassword . "\n");
			$bSave = true;
		}

		// Pre-configure domain
		$oProvider = \RainLoop\Api::Actions()->DomainProvider();
		$oDomain = $oProvider->Load('nextcloud');
		if (!$oDomain) {
			$output->info('Add nextcloud as domain');
//			$oDomain = \RainLoop\Model\Domain::fromIniArray('nextcloud', []);
			$oDomain = new \RainLoop\Model\Domain('nextcloud');
			$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::NONE;
			$oDomain->ImapSettings()->host = 'localhost';
			$oDomain->ImapSettings()->type = $iSecurityType;
			$oDomain->ImapSettings()->shortLogin = true;
			$oDomain->SieveSettings()->enabled = true;
			$oDomain->SieveSettings()->host = 'localhost';
			$oDomain->SieveSettings()->type = $iSecurityType;
			$oDomain->SmtpSettings()->host = 'localhost';
			$oDomain->SmtpSettings()->type = $iSecurityType;
			$oDomain->SmtpSettings()->shortLogin = true;
			$oProvider->Save($oDomain);
			if (!$oConfig->Get('login', 'default_domain', '')) {
				$oConfig->Set('login', 'default_domain', 'nextcloud');
				$bSave = true;
			}
		}

		if ($bSave) {
			$oConfig->Save()
				? $output->info('Config saved')
				: $output->info('Config failed');
		} else {
			$output->info('Config not changed');
		}

		// check if admins provided additional/custom initial config file
		// https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/occ_command.html#setting-a-single-configuration-value
		// ex: php occ config:app:set snappymail custom_config_file --value="/path/to/config.php"
		// https://github.com/the-djmaze/snappymail/pull/1197
		try {
			/** @var IConfig $ncConfig */
			$ncConfig = \OC::$server->get(IConfig::class);
			$customConfigFile = $ncConfig->getAppValue(Application::APP_ID, 'custom_config_file');
			if ($customConfigFile) {
				$output->info("Load custom config: {$customConfigFile}");
				if (!\str_contains($customConfigFile, ':') && \is_readable($customConfigFile)) {
					require $customConfigFile;
				} else {
					throw new \Exception("not found {$customConfigFile}");
				}
			}
		} catch (\Throwable $e) {
			$output->warning("custom config error: " . $e->getMessage());
			/** @var \Psr\Log\LoggerInterface $logger */
			$logger = \OC::$server->get(\Psr\Log\LoggerInterface::class);
			$logger->error("custom config error: " . $e->getMessage());
		}
	}
}
