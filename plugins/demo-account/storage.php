<?php

use RainLoop\Providers\Storage\Enumerations\StorageType;

class DemoStorage extends \RainLoop\Providers\Storage\FileStorage
{
	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	protected function generateFileName($mAccount, int $iStorageType, string $sKey, bool $bMkDir = false, bool $bForDeleteAction = false) : string
	{
		$sEmail = $sSubFolder = '';
		if ($mAccount instanceof \RainLoop\Model\MainAccount) {
			$sEmail = $mAccount->Email();
			if (StorageType::SIGN_ME === $iStorageType) {
				$sSubFolder = '/.sign_me';
			} else if (StorageType::SESSION === $iStorageType) {
				$sSubFolder = '/.sessions';
			}
		} else if (\is_string($mAccount)) {
			$sEmail = $mAccount;
		}
		if ($sEmail != $this->sDemoEmail) {
			return parent::generateFileName($mAccount, $iStorageType, $sKey, $bMkDir, $bForDeleteAction);
		}

		$sDataPath = "{$this->sDataPath}/demo";

		if (\is_dir($sDataPath) && 0 === \random_int(0, 100)) {
			\MailSo\Base\Utils::RecTimeDirRemove($sDataPath, 3600 * 3); // 3 hours
		}

		$sDataPath .= '/' . \RainLoop\Utils::fixName(\RainLoop\Utils::GetConnectionToken()) . $sSubFolder;
		\is_dir($sDataPath) || \mkdir($sDataPath, 0700, true);

		return $sDataPath . '/' . ($sKey ? \RainLoop\Utils::fixName($sKey) : '');
	}

	private $sDemoEmail;
	public function setDemoEmail(string $sEmail)
	{
		$this->sDemoEmail = $sEmail;
	}
}
