<?php

class ChangeSmtpEhloMessagePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('filter.smtp-credentials', 'FilterSmtpCredentials');
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aSmtpCredentials
	 */
	public function FilterSmtpCredentials($oAccount, &$aSmtpCredentials)
	{
		if ($oAccount instanceof \RainLoop\Model\Account && \is_array($aSmtpCredentials))
		{
			// Default:
			// $aSmtpCredentials['Ehlo'] = \MailSo\Smtp\SmtpClient::EhloHelper();
			//
			// or write your custom php
			$aSmtpCredentials['Ehlo'] = 'localhost';
		}
	}
}
