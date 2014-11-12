<?php

namespace RainLoop\Providers;

abstract class AbstractProvider
{
	/**
	 * @var \RainLoop\Model\Account
	 */
	protected $oAccount;
	
	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger = null;

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return false;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 */
	public function SetAccount($oAccount)
	{
		$this->oAccount = $oAccount;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 */
	public function SetLogger($oLogger)
	{
		if ($oLogger instanceof \MailSo\Log\Logger)
		{
			$this->oLogger = $oLogger;
		}
	}

	/**
	 * @return \MailSo\Log\Logger|null
	 */
	public function Logger()
	{
		return $this->oLogger;
	}
}
