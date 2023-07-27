<?php

namespace OCA\SnappyMail\Util;

class RainLoop
{

	public static function getLoginCredentials($sUID, $config) : ?array
	{
		$sEmail = \trim($config->getUserValue($sUID, 'rainloop', 'rainloop-email'));
		if ($sEmail) {
			$sPassword = $config->getUserValue($sUID, 'rainloop', 'rainloop-password', '');
			return [
				$sEmail,
				$sPassword ? static::decodePassword($sPassword, \md5($sEmail)) : ''
			];
		}
		return null;
	}

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
		$oConfig->Set('webmail', 'theme', 'Nextcloud@custom');
		$oConfig->Save();

		return $result;
	}

	/**
	 * @param string $sPassword
	 * @param string $sSalt
	 *
	 * @return string
	 */
	public static function decodePassword($sPassword, $sSalt)
	{
		$sPassword = \base64_decode(\trim($sPassword));

		$method = 'AES-256-CBC';
		if (\function_exists('openssl_encrypt')
		 && \function_exists('openssl_decrypt')
		 && \function_exists('openssl_random_pseudo_bytes')
		 && \function_exists('openssl_cipher_iv_length')
		 && \function_exists('openssl_get_cipher_methods')
		 && \defined('OPENSSL_RAW_DATA')
		 && \defined('OPENSSL_ZERO_PADDING')
		 && \in_array($method, \openssl_get_cipher_methods())
		) {
			$aParts = \explode('|', $sPassword, 2);
			if (\is_array($aParts) && !empty($aParts[0]) && !empty($aParts[1])) {
				$sData = \base64_decode($aParts[0]);
				$iv = \base64_decode($aParts[1]);
				return \base64_decode(\trim(
					\openssl_decrypt($sData, $method, \md5($sSalt), OPENSSL_RAW_DATA, $iv)
				));
			}
		}

		if (\function_exists('mcrypt_encrypt')
		 && \function_exists('mcrypt_decrypt')
		 && \defined('MCRYPT_RIJNDAEL_256')
		 && \defined('MCRYPT_MODE_ECB')
		) {
			return \base64_decode(\trim(
				\mcrypt_decrypt(MCRYPT_RIJNDAEL_256, \md5($sSalt), $sPassword, MCRYPT_MODE_ECB)
			));
		}

		return $sPassword;
	}
}
