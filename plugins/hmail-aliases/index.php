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
		$oProvider = new HmailserverChangePasswordDriver();
		$oLogger($this->Manager()->Actions()->Logger());
		$sLogin = (string) $this->Config()->Get('plugin', 'login', '');
		$sPassword = (string) $this->Config()->Get('plugin', 'password', '');
		$bResult = false;

		try
		{
			$oHmailApp = new COM("hMailServer.Application");
			$oHmailApp->Connect();

			if ($oHmailApp->Authenticate($sLogin, $sPassword))
			{
				$sEmail = $oHmailAccount->Email();
				$sDomain = \MailSo\Base\Utils::GetDomainFromEmail($sEmail);

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
                        
                        // ========vvv========= Update Rainloop Idnetity ========vvv=========

                        $datadir = \trim($this->Config()->Get('plugin', 'rainloopDatalocation', ''));
                        if ($datadir != ""){
                            $userpath = $datadir.'data/_data_/_default_/storage/cfg/'.substr($oAccount->Email(), 0, 2).'/'.$oAccount->Email().'/identities';
                        } else {
                            $userpath = APP_INDEX_ROOT_PATH.'_data_/_default_/storage/cfg/'.substr($oAccount->Email(), 0, 2).'/'.$oAccount->Email().'/identities';
                        }
        
                        $newidentitiesobj = array();
                        
                        //Get existing settings. If not a alias created by hmail. Transfer settings to the new array.
                        $identities = file_get_contents($userpath, true);
                        if ($identities != "") {
                            $identities = json_decode($identities, true);
                            error_log(print_r($identities, true));
                            foreach ($identities as $row) {
                                if (strpos($row['Id'], 'HMAIL') === false) {
                                    array_push($newidentitiesobj, $row);
                                }
                            }
                        }
                        
                        $obj = array();
                        $obj['Id'] = "HMAIL".base64_encode($sEmail);
                        $obj['Email'] = $sEmail;
                        $obj['Name'] = $name;
                        $obj['ReplyTo'] = "";
                        $obj['Bcc'] = "";
                        $obj['Signature'] = "";
                        $obj['SignatureInsertBefore'] = false;
                        array_push($newidentitiesobj, $obj);
                        
                        file_put_contents($userpath, json_encode($newidentitiesobj));
                        // ========^^^========= Update Rainloop Idnetity ========^^^=========

						$bResult = true;
					}
					else
					{
						$this->oLogger->Write('HMAILSERVER: Unknown account ('.$sEmail.')', \MailSo\Log\Enumerations\Type::ERROR);
					}
				}
				else
				{
					$this->oLogger->Write('HMAILSERVER: Unknown domain ('.$sDomain.')', \MailSo\Log\Enumerations\Type::ERROR);
				}
			}
			else
			{
				$this->oLogger->Write('HMAILSERVER: Auth error', \MailSo\Log\Enumerations\Type::ERROR);
			}
		}
		catch (\Exception $oException)
		{
			if ($this->oLogger)
			{
				$this->oLogger->WriteException($oException);
			}
		}

		return $bResult;
        
        //==========================================================================

        
        $hmailconn = mysqli_connect($dbservername, $dbusername, $dbpassword, $dbname, $dbport);

        // Check connection
        if (!$hmailconn) {
            echo "Hmail-aliases: connection to db failed";
            return;
        }
        //Get aliases
        $result = $hmailconn->query("SELECT * FROM " . $dbname . ".hm_aliases WHERE aliasvalue='".$oAccount->Email()."'");

        if ($result->num_rows > 0) {
            $newidentitiesobj = array();

            //Get user account
            $result2 = $hmailconn->query("SELECT * FROM " . $dbname . ".hm_accounts WHERE accountaddress='".$oAccount->Email()."'");
            $result2 = $result2->fetch_assoc();
            $firstname = $result2['accountpersonfirstname'];
            $lastname = $result2['accountpersonlastname'];

            if ($firstname == "" && $lastname == "") {
                $name = "";
            } else {
                $name = $firstname." ".$lastname;
            }

            //Get existing settings. If not a alias created by hmail. Transfer settings to the new array.
            $identities = file_get_contents($userpath, true);
            if ($identities != "") {
                $identities = json_decode($identities, true);
                error_log(print_r($identities, true));
                foreach ($identities as $row) {
                    if (strpos($row['Id'], 'HMAIL') === false) {
                        array_push($newidentitiesobj, $row);
                    }
                }
            }

            // output data of each row
            while ($row = $result->fetch_assoc()) {
                $obj = array();
                $obj['Id'] = "HMAIL".base64_encode($row["aliasname"]);
                $obj['Email'] = $row["aliasname"];
                $obj['Name'] = $name;
                $obj['ReplyTo'] = "";
                $obj['Bcc'] = "";
                $obj['Signature'] = "";
                $obj['SignatureInsertBefore'] = false;
                array_push($newidentitiesobj, $obj);
            }
            file_put_contents($userpath, json_encode($newidentitiesobj));
        }
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
			->SetDefaultValue(''),
          \RainLoop\Plugins\Property::NewInstance('rainloopDatalocation')->SetLabel('Data folder location')
            ->SetDefaultValue('')
            ->SetDescription('Incase of custom data directory location. Eg. nextcloud/owncloud version (Leave blank for default)')
        );
    }
}
