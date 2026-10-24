<?php

namespace OCA\SnappyMail\Util;

class RainLoop
{
	/**
	 * Imports data from RainLoop
	 * skips: /data/rainloop-storage/_data_/_default_/configs/application.ini
	 * skips: /data/rainloop-storage/_data_/_default_/domains/disabled
	 * skips: /data/rainloop-storage/SALT.php
	 * skips: /data/rainloop-storage/index.html
	 * skips: /data/rainloop-storage/INSTALLED
	 * skips: /data/rainloop-storage/index.php
	 */
	public static function import() : array
	{
		$dir = \rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/');
		$dir_snappy = $dir . '/appdata_snappymail/';
		$dir_rainloop = $dir . '/rainloop-storage';
		$result = [];
		$rainloop_plugins = [];
		if (\is_dir($dir_rainloop)) {
			\is_dir($dir_snappy) || \mkdir($dir_snappy, 0755, true);
			$iterator = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator($dir_rainloop, \RecursiveDirectoryIterator::SKIP_DOTS),
				\RecursiveIteratorIterator::SELF_FIRST
			);
			foreach ($iterator as $item) {
				$target = $dir_snappy . $iterator->getSubPathname();
				if (\preg_match('@/plugins/([^/]+)@', $target, $match)) {
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

		SnappyMailHelper::loadApp();

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
		$oConfig->Set('webmail', 'theme', 'NextcloudV25+');
		$oConfig->Save();

		return $result;
	}
}
