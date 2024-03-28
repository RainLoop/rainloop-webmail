<?php

class ChangeSmtpEhloMessagePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change SMTP EHLO Message',
		CATEGORY = 'General',
		DESCRIPTION = 'Extension to enable custom SMTP EHLO messages';

	public function Init() : void
	{
		$this->addHook('smtp.before-connect', 'FilterSmtpCredentials');
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aSmtpCredentials
	 */
	public function FilterSmtpCredentials(\RainLoop\Model\Account $oAccount,
		\MailSo\Smtp\SmtpClient $oSmtpClient,
		array &$aSmtpCredentials)
	{
		// Default:
		// $aSmtpCredentials['Ehlo'] = \MailSo\Smtp\SmtpClient::EhloHelper();
		//
		// or write your custom php
		$aSmtpCredentials['Ehlo'] = 'localhost';
	}
}
