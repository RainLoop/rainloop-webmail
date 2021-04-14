<?php

class ChangeSmtpEhloMessagePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = '',
		CATEGORY = 'General',
		DESCRIPTION = '';

	public function Init() : void
	{
		$this->addHook('smtp.credentials', 'FilterSmtpCredentials');
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
