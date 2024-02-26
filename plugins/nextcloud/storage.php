<?php

use RainLoop\Providers\Storage\Enumerations\StorageType;

class NextcloudStorage extends \RainLoop\Providers\Storage\FileStorage
{
	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function GenerateFilePath($mAccount, int $iStorageType, bool $bMkDir = false) : string
	{
		$sDataPath = parent::GenerateFilePath($mAccount, $iStorageType, $bMkDir);
		if (StorageType::CONFIG === $iStorageType) {
			$sUID = \OC::$server->getUserSession()->getUser()->getUID();
			$sDataPath .= ".config/{$sUID}/";
			if ($bMkDir && !\is_dir($sDataPath) && !\mkdir($sDataPath, 0700, true)) {
				throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sDataPath.'"');
			}
		}
		return $sDataPath;
	}
}
