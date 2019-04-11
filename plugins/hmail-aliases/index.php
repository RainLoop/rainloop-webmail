<?php

class HmailAliasesPlugin extends \RainLoop\Plugins\AbstractPlugin
{
    public function Init()
    {
        $this->addHook('event.login-post-login-provide', 'loginPostLoginProvide');
    }

    public function Supported()
    {
        if (!class_exists('mysqli')) {
            return 'The PHP exention mysqli must be installed to use this plugin';
        }

        return '';
    }

    /**
    * @param \RainLoop\Model\Account $oAccount
    * @throws \RainLoop\Exceptions\ClientException
    */
    public function loginPostLoginProvide(\RainLoop\Model\Account &$oAccount)
    {
        $dbservername = \trim($this->Config()->Get('plugin', 'hamilserver', ''));
        $dbusername = \trim($this->Config()->Get('plugin', 'hmaildbusername', ''));
        $dbpassword = \trim($this->Config()->Get('plugin', 'hmaildbpassword', ''));
        $dbname = \trim($this->Config()->Get('plugin', 'hmaildbtable', ''));
        $dbport = \trim($this->Config()->Get('plugin', 'hmaildbport', ''));
        $datadir = \trim($this->Config()->Get('plugin', 'rainloopDatalocation', ''));

        if ($datadir != ""){
          $userpath = $datadir.'data/_data_/_default_/storage/cfg/'.substr($oAccount->Email(), 0, 2).'/'.$oAccount->Email().'/identities';
        } else {
          $userpath = APP_INDEX_ROOT_PATH.'_data_/_default_/storage/cfg/'.substr($oAccount->Email(), 0, 2).'/'.$oAccount->Email().'/identities';
        }

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
                // $obj = '{"Id":"","Email":"'.$row["aliasname"].'","Name":"Erik Fryklund","ReplyTo":"","Bcc":"","Signature":"","SignatureInsertBefore":false}';
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
          \RainLoop\Plugins\Property::NewInstance('hamilserver')->SetLabel('db-host')
            ->SetDefaultValue('localhost'),
          \RainLoop\Plugins\Property::NewInstance('hmaildbusername')->SetLabel('db-username')
            ->SetDefaultValue(''),
          \RainLoop\Plugins\Property::NewInstance('hmaildbpassword')->SetLabel('db-password')
            ->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD),
          \RainLoop\Plugins\Property::NewInstance('hmaildbtable')->SetLabel('db-table')
            ->SetDefaultValue('mailserver'),
          \RainLoop\Plugins\Property::NewInstance('hmaildbport')->SetLabel('db-port')
            ->SetDefaultValue('3306')
            ->SetDescription('Connect to mysql hmailserver. The user must have rights to read "hm_aliases" table.'),
          \RainLoop\Plugins\Property::NewInstance('rainloopDatalocation')->SetLabel('Data folder location')
            ->SetDefaultValue('')
            ->SetDescription('Incase of custom data directory location. Eg. nextcloud/owncloud version (Leave blank for default)')
        );
    }
}
