<?php

/**
 * This extension automatically detects the IMAP and SMTP settings by
 * extracting them from the email address itself. For example, if the user
 * attemps to login as 'info@example.com', then the IMAP and SMTP host would
 * be set to to 'example.com'.
 *
 * Based on:
 * https://github.com/the-djmaze/snappymail/blob/master/plugins/override-smtp-credentials/index.php
 *
 */

class AutoDomainGrabPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Auto Domain Selection',
		VERSION  = '2.9',
		RELEASE = '2022-11-11',
		REQUIRED = '2.21.0',
		CATEGORY = 'General',
		DESCRIPTION = 'Sets the IMAP/SMTP host based on the user\'s login';

	private $imap_prefix = 'mail.';
	private $smtp_prefix = 'mail.';

	public function Init() : void
	{
		$this->addHook('smtp.before-connect', 'FilterSmtpCredentials');
		$this->addHook('imap.before-connect', 'FilterImapCredentials');
	}

	/**
	 * This function detects the IMAP Host, and if it is set to 'auto', replaces it with the MX or email domain.
	 */
	public function FilterImapCredentials(\RainLoop\Model\Account $oAccount, \MailSo\Imap\ImapClient $oImapClient, \MailSo\Imap\Settings $oSettings)
	{
		// Check for mail.$DOMAIN as entered value in RL settings
		if ('auto' === $oSettings->host)
		{
			$domain = \substr(\strrchr($oAccount->Email(), '@'), 1);
			$mxhosts = array();
			if (\getmxrr($domain, $mxhosts) && $mxhosts)
			{
				$oSettings->host = $mxhosts[0];
			}
			else
			{
				$oSettings->host = $this->imap_prefix.$domain;
			}
		}
	}

	/**
	 * This function detects the SMTP Host, and if it is set to 'auto', replaces it with the MX or email domain.
	 */
	public function FilterSmtpCredentials(\RainLoop\Model\Account $oAccount, \MailSo\Smtp\SmtpClient $oSmtpClient, \MailSo\Smtp\Settings $oSettings)
	{
		// Check for mail.$DOMAIN as entered value in RL settings
		if ('auto' === $oSettings->host)
		{
			$domain = \substr(\strrchr($oAccount->Email(), '@'), 1);
			$mxhosts = array();
			if (\getmxrr($domain, $mxhosts) && $mxhosts)
			{
				$oSettings->host = $mxhosts[0];
			}
			else
			{
				$oSettings->host = $this->smtp_prefix . $domain;
			}
		}
	}
}
