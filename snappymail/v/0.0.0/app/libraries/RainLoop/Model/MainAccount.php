<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Exceptions\ClientException;
use RainLoop\Providers\Storage\Enumerations\StorageType;

class MainAccount extends Account
{
	/**
	 * @var string
	 */
	private string $sCryptKey = '';
/*
	public function resealCryptKey(string $sOldPass, string $sNewPass) : string
	{
		$oStorage = \RainLoop\Api::Actions()->StorageProvider();
		$sKey = $oStorage->Get($this, StorageType::ROOT, 'cryptkey');
		if ($sKey) {
			$sKey = \SnappyMail\Crypt::DecryptUrlSafe($sKey, $sOldPass);
			$sKey = \SnappyMail\Crypt::EncryptUrlSafe($sKey, $sNewPass);
			$oStorage->Put($this, StorageType::ROOT, 'cryptkey', $sKey);
			$sKey = \SnappyMail\Crypt::DecryptUrlSafe($sKey, $sNewPass);
			$this->SetCryptKey($sKey);
		}
	}
*/
	public function CryptKey() : string
	{
		if (!$this->sCryptKey) {
/*
			// Seal the cryptkey so that people who change their login password
			// can use the old password to re-seal the cryptkey
			$oStorage = \RainLoop\Api::Actions()->StorageProvider();
			$sKey = $oStorage->Get($this, StorageType::ROOT, 'cryptkey');
			if (!$sKey) {
				$sKey = $this->IncPassword();
//				$sKey = \random_bytes(32);
				$sKey = \SnappyMail\Crypt::EncryptUrlSafe($sKey, $this->IncPassword());
				$oStorage->Put($this, StorageType::ROOT, 'cryptkey', $sKey);
			}
			$sKey = \SnappyMail\Crypt::DecryptUrlSafe($sKey, $this->IncPassword());
			$this->SetCryptKey($sKey);
*/
			$this->SetCryptKey($this->IncPassword());
		}
		return $this->sCryptKey;
	}

	public function SetCryptKey(string $sKey) : void
	{
		$this->sCryptKey = \sha1($sKey . APP_SALT, true);
	}
}
