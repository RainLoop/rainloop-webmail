<?php

namespace SnappyMail\SASL;

class Login extends \SnappyMail\SASL
{
	protected
		$passphrase;

	public function authenticate(string $username, string $passphrase, ?string $challenge = null) : string
	{
		if ($challenge && 'Username:' !== $this->decode($challenge)) {
			throw new \Exception("Invalid response: {$challenge}");
		}
		$this->passphrase = $passphrase;
		return $this->encode($username);
	}

	public function challenge(string $challenge) : ?string
	{
		if ($challenge && 'Password:' !== $this->decode($challenge)) {
			throw new \Exception("invalid response: {$challenge}");
		}
		return $this->encode($this->passphrase);
	}

	public static function isSupported(string $param) : bool
	{
		return true;
	}

}
