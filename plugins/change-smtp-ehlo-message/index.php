<?php

class ChangeSmtpEhloMessagePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change SMTP EHLO Message',
		CATEGORY = 'General',
		DESCRIPTION = 'Extension to enable custom SMTP EHLO messages';

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
