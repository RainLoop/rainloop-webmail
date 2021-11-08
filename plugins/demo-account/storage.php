<?php

class DemoStorage extends \RainLoop\Providers\Storage\FileStorage
{
	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	protected function generateFileName($mAccount, int $iStorageType, string $sKey, bool $bMkDir = false, bool $bForDeleteAction = false) : string
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY === $iStorageType) {
			return parent::generateFileName($mAccount, $iStorageType, $sKey, $bMkDir, $bForDeleteAction);
		}

		$sDataPath = "{$this->sDataPath}/demo";
		if (\is_dir($sDataPath) && 0 === \random_int(0, 100)) {
			\MailSo\Base\Utils::RecRmDir("{$this->sDataPath}/demo");
		}

		$sDataPath .= '/' . static::fixName(\RainLoop\Utils::GetConnectionToken());
		\is_dir($sDataPath) || \mkdir($sDataPath, 0700, true);

		return $sDataPath . '/' . ($sKey ? static::fixName($sKey) : '');
	}
}
