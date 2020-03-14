<?php

namespace RainLoop\Providers\ChangePassword;

interface ChangePasswordInterface
{
	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 */
	public function PasswordChangePossibility($oAccount) : bool;

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 */
	public function ChangePassword(\RainLoop\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool;
}
