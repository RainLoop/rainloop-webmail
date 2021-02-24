<?php

namespace RainLoop\Providers\ChangePassword;

interface ChangePasswordInterface
{
	public function isPossible(\RainLoop\Model\Account $oAccount) : bool;

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool;
}
