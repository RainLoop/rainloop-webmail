<?php

namespace RainLoop\Providers\TwoFactorAuth;

abstract class AbstractTwoFactorAuth
{
	/**
	 * @return string
	 */
	public function Label()
	{
		return 'Two Factor Authenticator Code';
	}
	
	/**
	 * @param string $sSecret
	 * @param string $sCode
	 * @return bool
	 */
	public function VerifyCode($sSecret, $sCode)
	{
		return false;
	}
}
