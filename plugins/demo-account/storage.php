<?php

use RainLoop\Providers\Storage\Enumerations\StorageType;

class DemoStorage extends \RainLoop\Providers\Storage\FileStorage
{
	private static $gc_done;

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	protected function generateFileName($mAccount, int $iStorageType, string $sKey, bool $bMkDir = false, bool $bForDeleteAction = false) : string
	{
		$sEmail = '';
		if ($mAccount instanceof \RainLoop\Model\MainAccount) {
			$sEmail = $mAccount->Email();
		} else if (\is_string($mAccount)) {
			$sEmail = $mAccount;
		}
		if ($sEmail != $this->sDemoEmail) {
			return parent::generateFileName($mAccount, $iStorageType, $sKey, $bMkDir, $bForDeleteAction);
		}

		$sDataPath = "{$this->sDataPath}/demo";

		// Garbage collection
		if (!static::$gc_done) {
			static::$gc_done = true;
			if (\is_dir($sDataPath) && 0 === \random_int(0, 100)) {
				\MailSo\Base\Utils::RecTimeDirRemove($sDataPath, 3600 * 3); // 3 hours
			}
		}

		$sDataPath .= '/' . \RainLoop\Utils::fixName(\RainLoop\Utils::GetConnectionToken());
		if (StorageType::SIGN_ME === $iStorageType) {
			$sDataPath .= '/.sign_me';
		} else if (StorageType::SESSION === $iStorageType) {
			$sDataPath .= '/.sessions';
		}
		\is_dir($sDataPath) || \mkdir($sDataPath, 0700, true);

		return $sDataPath . '/' . ($sKey ? \RainLoop\Utils::fixName($sKey) : '');
	}

	private $sDemoEmail;
	public function setDemoEmail(string $sEmail)
	{
		$this->sDemoEmail = $sEmail;
	}
}
