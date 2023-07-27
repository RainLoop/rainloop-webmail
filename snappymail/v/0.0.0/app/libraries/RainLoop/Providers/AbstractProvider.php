<?php

namespace RainLoop\Providers;

abstract class AbstractProvider
{
	use \MailSo\Log\Inherit;

	/**
	 * @var \RainLoop\Model\Account
	 */
	protected $oAccount;

	public function IsActive() : bool
	{
		return false;
	}

	public function SetAccount(\RainLoop\Model\Account $oAccount)
	{
		$this->oAccount = $oAccount;
	}
}
