<?php

use RainLoop\Providers\Storage\Enumerations\StorageType;

class DemoStorage extends \RainLoop\Providers\Storage\FileStorage
{
	private static $gc_done;

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function GenerateFilePath($mAccount, int $iStorageType, bool $bMkDir = false) : string
	{
		$sEmail = '';
		if ($mAccount instanceof \RainLoop\Model\MainAccount) {
			$sEmail = $mAccount->Email();
		} else if (\is_string($mAccount)) {
			$sEmail = $mAccount;
		}
		if ($sEmail != $this->sDemoEmail) {
			return parent::GenerateFilePath($mAccount, $iStorageType, $bMkDir);
		}

		$sDataPath = "{$this->sDataPath}/demo";

		// Garbage collection
		if (!static::$gc_done) {
			static::$gc_done = true;
			if (!\random_int(0, \max(50, \ini_get('session.gc_divisor')))) {
				\MailSo\Base\Utils::RecTimeDirRemove($sDataPath, 3600 * 3); // 3 hours
			}
		}

		$sDataPath .= '/' . \RainLoop\Utils::fixName(\RainLoop\Utils::GetConnectionToken());
		if (StorageType::SIGN_ME === $iStorageType) {
			$sDataPath .= '/.sign_me';
		} else if (StorageType::SESSION === $iStorageType) {
			$sDataPath .= '/.sessions';
		} else if (StorageType::PGP === $iStorageType) {
			$sDataPath .= '/.pgp';
			$sDataPath = "{$this->sDataPath}/demo.pgp/.pgp";
			$bMkDir = true;
		}

		if ($bMkDir && !\is_dir($sDataPath) && !\mkdir($sDataPath, 0700, true))
		{
			throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sDataPath.'"');
		}

		return $sDataPath . '/';
	}

	private $sDemoEmail;
	public function setDemoEmail(string $sEmail)
	{
		$this->sDemoEmail = $sEmail;
	}
}
