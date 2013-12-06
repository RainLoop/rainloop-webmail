<?php

namespace RainLoop\Providers;

abstract class AbstractProvider
{
	/**
	 * @var \RainLoop\Account
	 */
	protected $oAccount;

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 */
	public function SetAccount($oAccount)
	{
		$this->oAccount = $oAccount;
	}
}
