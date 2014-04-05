<?php

namespace RainLoop\Providers\TwoFactorAuth;

interface TwoFactorAuthInterface
{
	/**
	 * @param string $sSecret
	 * @param string $sCode
	 * 
	 * @return bool
	 */
	public function VerifyCode($sSecret, $sCode);
}
