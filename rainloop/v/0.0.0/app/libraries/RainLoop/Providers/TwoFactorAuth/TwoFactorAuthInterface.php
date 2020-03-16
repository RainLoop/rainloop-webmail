<?php

namespace RainLoop\Providers\TwoFactorAuth;

interface TwoFactorAuthInterface
{

	public function VerifyCode(string $sSecret, string $sCode) : bool;
}
