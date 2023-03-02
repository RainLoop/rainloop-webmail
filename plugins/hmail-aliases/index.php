<?php

class HmailAliasesPlugin extends \RainLoop\Plugins\AbstractPlugin
{
    public function Init()
    {
        $this->addHook('event.login-post-login-provide', 'loginPostLoginProvide');
    }

    public function Supported()
    {
		if (!class_exists('COM'))
		{
			return 'The PHP extension COM must be installed to use this plugin';
		}

		return '';
    }

    /**
    * @param \RainLoop\Model\Account $oAccount
    * @throws \RainLoop\Exceptions\ClientException
    */
    public function loginPostLoginProvide(\RainLoop\Model\Account &$oAccount)
    {
        // Get Logger
		$oLogger = $this->Manager()->Actions()->Logger();
        // Load values from configuration
		$sLogin = (string) $this->Config()->Get('plugin', 'login', '');
		$sPassword = (string) $this->Config()->Get('plugin', 'password', '');
        // prime result value
		$bResult = false;

		try
		{
            // Create a connection with the hMailServer
			$oHmailApp = new COM("hMailServer.Application");
			$oHmailApp->Connect();

            //$oLogger->Write("Connected");
			if ($oHmailApp->Authenticate($sLogin, $sPassword))
			{
                //$oLogger->Write("Authenticated");
				$sEmail = $oAccount->Email();
                //$oLogger->Write("Using ". $sEmail);
				$sDomain = \MailSo\Base\Utils::GetDomainFromEmail($sEmail);
                //$oLogger->Write("Searching for domain ".$sDomain);

				$oHmailDomain = $oHmailApp->Domains->ItemByName($sDomain);
				if ($oHmailDomain)
				{
					$oHmailAccount = $oHmailDomain->Accounts->ItemByAddress($sEmail);
					if ($oHmailAccount)
					{
                        // Get account details for alias
                        $firstName = $oHmailAccount->PersonFirstName;
                        $lastName = $oHmailAccount->PersonLastName;
                        if ($firstName == "" && $lastName == "") {
                            $name = "";
                        } else {
                            $name = $firstName." ".$lastName;
                        }
                        
                        // ========vvv========= Update Rainloop Identity ========vvv=========
                        $identities = $this->Manager()->Actions()->GetIdentities($oAccount);
                        if(empty($identities)){
                            // I am assuming [0] is the "default" identity...
                            $identity = \RainLoop\Model\Identity::NewInstanceFromAccount($oAccount);
                            array_push($identities, $identity);
                        }
                        
                        $identity = $identities[0];
                        $identity->FromJSON(array('Email' => $sEmail, 'Name' => $name));
                        // TODO Account::DoIdentityUpdate is possible if I knew how to use actoinParams
                        $result = $this->Manager()->Actions()->SetIdentities($oAccount, $identities);
                        $oLogger->Write('HMAILSERVER Identity Update Successful');
                        // ========^^^========= Update Rainloop Idnetity ========^^^=========
						$bResult = true;
					}
					else
					{
						$oLogger->Write('HMAILSERVER: Unknown account ('.$sEmail.')', \MailSo\Log\Enumerations\Type::ERROR);
					}
				}
				else
				{
					$oLogger->Write('HMAILSERVER: Unknown domain ('.$sDomain.')', \MailSo\Log\Enumerations\Type::ERROR);
				}
			}
			else
			{
				$oLogger->Write('HMAILSERVER: Auth error', \MailSo\Log\Enumerations\Type::ERROR);
			}
		}
		catch (\Exception $oException)
		{
			if ($oLogger)
			{
				$oLogger->WriteException($oException);
			}
		}

		return $bResult;
    }

    /**
     * @return array
     */
    public function configMapping()
    {
        return array(
		  \RainLoop\Plugins\Property::NewInstance('login')->SetLabel('HmailServer Admin Login')
			->SetDefaultValue('Administrator'),
		  \RainLoop\Plugins\Property::NewInstance('password')->SetLabel('HmailServer Admin Password')
			->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
			->SetDefaultValue('')
        );
    }
}
