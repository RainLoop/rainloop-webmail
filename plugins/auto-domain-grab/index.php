<?php
/**
 * This plug-in automatically detects the IMAP and SMTP settings by extracting them from the email address itself.
 * For example, user inputs: "info@example.com"
 * This plugin sets the IMAP and SMTP host to "example.com" upon login, and then connects to it.
 *
 * Based on:
 * https://github.com/RainLoop/rainloop-webmail/blob/master/plugins/override-smtp-credentials/index.php
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
     * @param \RainLoop\Model\Account $oAccount
     * @param array $aImapCredentials
     */
    public function FilterImapCredentials($oAccount, &$aImapCredentials)
    {
        if ($oAccount instanceof \RainLoop\Model\Account && \is_array($aImapCredentials))
                {
            $sEmail = $oAccount->Email();

            // Check for mail.$DOMAIN as entered value in RL settings
            if ( $aImapCredentials['Host'] == "auto"  )
            {
                $aImapCredentials['Host'] = $this->getDomainFromEmail($sEmail);
            }
        }
    }

     /**
     * This function detects the SMTP Host, and if it is set to "auto", replaces it with the email domain.
     * @param \RainLoop\Model\Account $oAccount
     * @param array $aSmtpCredentials
     */
    public function FilterSmtpCredentials($oAccount, &$aSmtpCredentials)
    {
        if ($oAccount instanceof \RainLoop\Model\Account && \is_array($aSmtpCredentials))
        {
            $sEmail = $oAccount->Email();

            // Check for mail.$DOMAIN as entered value in RL settings
            if ( $aSmtpCredentials['Host'] == "auto" )
            {
                $aSmtpCredentials['Host'] = $this->getDomainFromEmail($sEmail);
            }
        }
    }


    /**
     * This function extracts the domain from the email address.
     * @param string $emailAdress
     * @return string
     */
    private function getDomainFromEmail($emailAddress){

        $parts = explode("@", trim($emailAddress));
        return $parts[1];
    }
}

?>
