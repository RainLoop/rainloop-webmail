<?php

namespace RainLoop\Providers\TwoFactorAuth;

abstract class AbstractTwoFactorAuth
{

	public function Label() : string
	{
		return 'Two Factor Authenticator Code';
	}

	public function VerifyCode(string $sSecret, string $sCode) : bool
	{
		return false;
	}
}
