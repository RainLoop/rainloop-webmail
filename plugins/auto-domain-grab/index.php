<?php

/**
 * This plug-in automatically detects the IMAP and SMTP settings by extracting them from the email address itself.
 * For example, user inputs: "info@example.com"
 * This plugin sets the IMAP and SMTP host to "example.com" upon login, and then connects to it.
 *
 * Based on:
 * https://github.com/RainLoop/rainloop-webmail/blob/master/plugins/override-smtp-credentials/index.php
 * 
 */

class AutoDomainGrabPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('filter.smtp-credentials', 'FilterSmtpCredentials');
		$this->addHook('filter.imap-credentials', 'FilterImapCredentials');
	}

	/**
	 * This function detects the IMAP Host, and if it is set to "auto", replaces it with the email domain.
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
				$aImapCredentials['Host'] = \MailSo\Base\Utils::GetDomainFromEmail($oAccount->Email());
			}
		}
	}

	/**
	 * This function detects the SMTP Host, and if it is set to "auto", replaces it with the email domain.
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
				$aSmtpCredentials['Host'] = \MailSo\Base\Utils::GetDomainFromEmail($oAccount->Email());
			}
		}
	}
}
