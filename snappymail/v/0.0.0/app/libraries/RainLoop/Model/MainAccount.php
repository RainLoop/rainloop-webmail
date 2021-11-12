<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Exceptions\ClientException;

class MainAccount extends Account
{
	/**
	 * @var string
	 */
	private $sCryptKey;

	public function CryptKey() : string
	{
		if (!$this->sCryptKey) {
			$this->SetCryptKey($this->IncPassword() ?: APP_SALT);
		}
		return $this->sCryptKey;
	}

	public function SetCryptKey(string $sKey) : void
	{
		$this->sCryptKey = \sha1($sKey, true);
	}
}
