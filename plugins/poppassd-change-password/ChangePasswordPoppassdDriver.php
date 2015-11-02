<?php

class ChangePasswordPoppassdDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $sHost = '127.0.0.1';

	/**
	 * @var int
	 */
	private $iPort = 106;

	/**
	 * @var string
	 */
	private $sAllowedEmails = '';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @param string $sHost
	 *
	 * @return \ChangePasswordPoppassdDriver
	 */
	public function SetHost($sHost)
	{
		$this->sHost = $sHost;
		return $this;
	}

	/**
	 * @param int $iPort
	 *
	 * @return \ChangePasswordPoppassdDriver
	 */
	public function SetPort($iPort)
	{
		$this->iPort = (int) $iPort;
		return $this;
	}

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \ChangePasswordPoppassdDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \ChangePasswordPoppassdDriver
	 */
	public function SetLogger($oLogger)
	{
		if ($oLogger instanceof \MailSo\Log\Logger)
		{
			$this->oLogger = $oLogger;
		}

		return $this;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return bool
	 */
	public function PasswordChangePossibility($oAccount)
	{
		return $oAccount && $oAccount->Email() &&
			\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->sAllowedEmails);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sPrevPassword
	 * @param string $sNewPassword
	 *
	 * @return bool
	 */
	public function ChangePassword(\RainLoop\Account $oAccount, $sPrevPassword, $sNewPassword)
	{
		$bResult = false;

		try
		{
			$oPoppassdClient = \MailSo\Poppassd\PoppassdClient::NewInstance();
			if ($this->oLogger instanceof \MailSo\Log\Logger)
			{
				$oPoppassdClient->SetLogger($this->oLogger);
			}

			$oPoppassdClient
				->Connect($this->sHost, $this->iPort)
				->Login($oAccount->Login(), $oAccount->Password())
				->NewPass($sNewPassword)
				->LogoutAndDisconnect()
			;

			$bResult = true;
		}
		catch (\Exception $oException)
		{
			$bResult = false;
		}

		return $bResult;
	}
}