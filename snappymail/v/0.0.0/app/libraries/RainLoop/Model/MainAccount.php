<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Exceptions\ClientException;
use RainLoop\Providers\Storage\Enumerations\StorageType;
use SnappyMail\SensitiveString;

class MainAccount extends Account
{
	private ?SensitiveString $sCryptKey = null;
/*
	public function resealCryptKey(
		#[\SensitiveParameter]
		string $sOldPass,
		#[\SensitiveParameter]
		string $sNewPass
	) : bool
	{
		$oStorage = \RainLoop\Api::Actions()->StorageProvider();
		$sKey = $oStorage->Get($this, StorageType::ROOT, '.cryptkey');
		if ($sKey) {
			$sKey = \SnappyMail\Crypt::DecryptUrlSafe($sKey, $sOldPass);
			if ($sKey) {
				$sKey = \SnappyMail\Crypt::EncryptUrlSafe($sKey, $sNewPass);
				if ($sKey) {
					$oStorage->Put($this, StorageType::ROOT, '.cryptkey', $sKey);
					$sKey = \SnappyMail\Crypt::DecryptUrlSafe($sKey, $sNewPass);
					$this->SetCryptKey($sKey);
					return true;
				}
			}
		}
		return false;
	}
*/
	public function CryptKey() : string
	{
		if (!$this->sCryptKey) {
			$sKey = \sha1($this->IncPassword() . APP_SALT, true);
/*
			// Seal the cryptkey so that people who change their login password
			// can use the old password to re-seal the cryptkey
			$oStorage = \RainLoop\Api::Actions()->StorageProvider();
			$sKey = $oStorage->Get($this, StorageType::ROOT, '.cryptkey');
			if (!$sKey) {
				$sKey = \sha1($this->IncPassword() . APP_SALT, true);
				$sKey = \SnappyMail\Crypt::EncryptUrlSafe($sKey, $this->IncPassword());
				$oStorage->Put($this, StorageType::ROOT, '.cryptkey', $sKey);
			}
			$sKey = \SnappyMail\Crypt::DecryptUrlSafe($sKey, $this->IncPassword());
*/
			$this->SetCryptKey($sKey);
		}
		return $this->sCryptKey;
	}

	public function SetCryptKey(
		#[\SensitiveParameter]
		string $sKey
	) : void
	{
		$this->sCryptKey = new SensitiveString($sKey);
	}
}
