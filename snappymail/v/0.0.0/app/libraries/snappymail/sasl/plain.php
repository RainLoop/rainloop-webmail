<?php

namespace SnappyMail\SASL;

class Plain extends \SnappyMail\SASL
{

	public function authenticate(string $username,
		#[\SensitiveParameter]
		string $passphrase,
		?string $authzid = null) : string
	{
		return $this->encode("{$authzid}\x00{$username}\x00{$passphrase}");
	}

	public static function isSupported(string $param) : bool
	{
		return true;
	}

}
