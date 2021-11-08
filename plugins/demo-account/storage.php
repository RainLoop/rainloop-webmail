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

		return $this->sDataPath
			.'/demo'
			.'/'.static::fixName(\RainLoop\Utils::GetConnectionToken())
			.'/'.($sKey ? static::fixName($sKey) : '');
	}
}
