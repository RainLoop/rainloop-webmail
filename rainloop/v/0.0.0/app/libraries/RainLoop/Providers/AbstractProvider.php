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

	public function IsActive() : bool
	{
		return false;
	}

	public function SetAccount(\RainLoop\Model\Account $oAccount)
	{
		$this->oAccount = $oAccount;
	}

	public function SetLogger(?\MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
	}

	public function Logger() : ?\MailSo\Log\Logger
	{
		return $this->oLogger;
	}
}
