<?php

/**
 * This plug-in automatically detects the IMAP and SMTP settings by extracting them from the email address itself.
 * For example, user inputs: "info@example.com"
 * This plugin sets the IMAP and SMTP host to "example.com" upon login, and then connects to it.
 *
 * Based on:
 * https://github.com/the-djmaze/snappymail/blob/master/plugins/override-smtp-credentials/index.php
 *
 */

class AutoDomainGrabPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = '',
		VERSION = '2.1',
		REQUIRED = '2.5.0',
		CATEGORY = 'General',
		DESCRIPTION = '';

	private $imap_prefix = "mail.";
	private $smtp_prefix = "mail.";

	public function Init() : void
	{
		$this->addHook('smtp.credentials', 'FilterSmtpCredentials');
		$this->addHook('imap.credentials', 'FilterImapCredentials');
	}

	/**
	 * This function detects the IMAP Host, and if it is set to "auto", replaces it with the MX or email domain.
	 *
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aImapCredentials
	 */
	public function FilterImapCredentials($oAccount, &$aImapCredentials)
	{
		if ($oAccount instanceof \RainLoop\Model\Account && \is_array($aImapCredentials))
		{
			// Check for mail.$DOMAIN as entered value in RL settings
			if (!empty($aImapCredentials['Host']) && 'auto' === $aImapCredentials['Host'])
			{
				$domain = substr(strrchr($oAccount->Email(), "@"), 1);
				$mxhosts = array();
				if(getmxrr($domain, $mxhosts) && sizeof($mxhosts) > 0)
				{
					$aImapCredentials['Host'] = $mxhosts[0];
				}
				else
				{
					$aImapCredentials['Host'] = $this->imap_prefix.$domain;
				}
			}
		}
	}

	/**
	 * This function detects the SMTP Host, and if it is set to "auto", replaces it with the MX or email domain.
	 *
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aSmtpCredentials
	 */
	public function FilterSmtpCredentials($oAccount, &$aSmtpCredentials)
	{
		if ($oAccount instanceof \RainLoop\Model\Account && \is_array($aSmtpCredentials))
		{
			// Check for mail.$DOMAIN as entered value in RL settings
			if (!empty($aSmtpCredentials['Host']) && 'auto' === $aSmtpCredentials['Host'])
			{
				$domain = substr(strrchr($oAccount->Email(), "@"), 1);
				$mxhosts = array();
				if(getmxrr($domain, $mxhosts) && sizeof($mxhosts) > 0)
				{
					$aSmtpCredentials['Host'] = $mxhosts[0];
				}
				else
				{
					$aSmtpCredentials['Host'] = $this->smtp_prefix.$domain;
				}
			}
		}
	}
}
