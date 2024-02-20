<?php
/**
 * This class is inspired by PEAR Crypt_GPG and PECL gnupg
 * It does not support gpg v1 because that is missing ECDH, ECDSA, EDDSA
 * It does not support gpg < v2.2.5 as they are from before 2018
 */

namespace SnappyMail\PGP;

class Backup
{
	public static function PGPKey(string $key, string $keyId = '') : bool
	{
		$oActions = \RainLoop\Api::Actions();
		$oAccount = $oActions->getMainAccountFromToken();
		if ($oAccount) {
			$keyId = $keyId ? "0x{$keyId}" : \sha1($key);
			$dir = $oActions->StorageProvider()->GenerateFilePath(
				$oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::PGP,
				true
			);
			if (\str_contains($key, 'PGP PRIVATE KEY')) {
				$hash = $oAccount->CryptKey();
				$key = \SnappyMail\Crypt::Encrypt($key, $hash);
				$key[1] = \base64_encode($key[1]);
				$key[2] = \base64_encode($key[2]);
				$key[3] = \hash_hmac('sha1', $key[2], $hash);
				return !!\file_put_contents("{$dir}{$keyId}.key", \json_encode($key));
			}
			if (\str_contains($key, 'PGP PUBLIC KEY')) {
				return !!\file_put_contents("{$dir}{$keyId}_public.asc", $key);
			}
		}
		return false;
	}

	public static function getKeys() : array
	{
		$result = [
			'public' => [],
			'private' => []
		];
		$oActions = \RainLoop\Api::Actions();
		$oAccount = $oActions->getMainAccountFromToken();
		if ($oAccount) {
			$dir = $oActions->StorageProvider()->GenerateFilePath(
				$oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::PGP,
				true
			);
			$hash = $oAccount->CryptKey();
			foreach (\glob("{$dir}*") as $file) {
				if (\is_file($file)) {
					if ('_public.asc' === \substr($file, -11)) {
						$result['public'][] = [
							'id' => \basename($file),
							'value' => \file_get_contents($file),
						];
					} else if ('.key' === \substr($file, -4)) {
						$key = \json_decode(\file_get_contents($file));
						if (\is_array($key)) {
							$mac = \array_pop($key);
							if (!empty($key[2]) && \hash_hmac('sha1', $key[2], $hash) === $mac) {
								$key[1] = \base64_decode($key[1]);
								$key[2] = \base64_decode($key[2]);
								$result['private'][] = [
									'id' => \basename($file),
									'value' => \SnappyMail\Crypt::Decrypt($key, $hash),
								];
							}
						}
					}
				}
			}
		}
		return $result;
	}
}
