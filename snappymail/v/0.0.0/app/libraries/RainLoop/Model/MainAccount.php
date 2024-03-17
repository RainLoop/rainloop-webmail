<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Exceptions\ClientException;
use RainLoop\Providers\Storage\Enumerations\StorageType;
use SnappyMail\SensitiveString;

class MainAccount extends Account
{
	private ?SensitiveString $sCryptKey = null;

	public function resealCryptKey(SensitiveString $oOldPass) : bool
	{
		$sKey = $this->CryptKey();
		if ($sKey) {
			$sKey = \SnappyMail\Crypt::EncryptToJSON(\bin2hex($sKey), $this->IncPassword());
			if ($sKey) {
				\RainLoop\Api::Actions()->StorageProvider()->Put($this, StorageType::ROOT, '.cryptkey', $sKey);
				$sKey = \SnappyMail\Crypt::DecryptFromJSON($sKey, $this->IncPassword());
				if ($sKey) {
					$this->sCryptKey = new SensitiveString(\hex2bin($sKey));
				}
				return true;
			}
		}
		return false;
	}

	public function CryptKey() : string
	{
		if (!$this->sCryptKey) {
			// Seal the cryptkey so that people who change their login password
			// can use the old password to re-seal the cryptkey
			$oStorage = \RainLoop\Api::Actions()->StorageProvider();
			$sKey = $oStorage->Get($this, StorageType::ROOT, '.cryptkey');
			if (!$sKey) {
				$sKey = \SnappyMail\Crypt::EncryptToJSON(
					\sha1($this->IncPassword() . APP_SALT),
					$this->IncPassword()
				);
				$oStorage->Put($this, StorageType::ROOT, '.cryptkey', $sKey);
			}
			$sKey = \SnappyMail\Crypt::DecryptFromJSON($sKey, $this->IncPassword());
			if ($sKey) {
				$this->sCryptKey = new SensitiveString(\hex2bin($sKey));
			}
		}
		return $this->sCryptKey;
	}

/*
	// Stores settings in MainAccount
	public function settings() : \RainLoop\Settings
	{
		return \RainLoop\Api::Actions()->SettingsProvider()->Load($this);
	}
*/
}
