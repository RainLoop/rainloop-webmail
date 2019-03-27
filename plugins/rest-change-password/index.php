<?php

class RestChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
{
    public function Init()
    {
        $this->addHook('main.fabrica', 'MainFabrica');
    }

    /**
     * @param string $sName
     * @param mixed $oProvider
     */
    public function MainFabrica($sName, &$oProvider)
    {
        switch ($sName)
        {
            case 'change-password':

                $sUrl = \trim($this->Config()->Get('plugin', 'rest_url', ''));
                $sKey = \trim($this->Config()->Get('plugin', 'rest_key', ''));

                $sFieldEmail = \trim($this->Config()->Get('plugin', 'rest_field_email', ''));
                $sFieldOldpassword = \trim($this->Config()->Get('plugin', 'rest_field_oldpassword', ''));
                $sFieldNewpassword = \trim($this->Config()->Get('plugin', 'rest_field_newpassword', ''));

                if (!empty($sHost) && (!empty($sKey)))
                {
                    include_once __DIR__.'/RestChangePasswordDriver.php';

                    $oProvider = new RestChangePasswordDriver();
                    $oProvider->SetLogger($this->Manager()->Actions()->Logger());
                    $oProvider->SetConfig($sUrl, $sKey);
                    $oProvider->SetFieldNames($sFieldEmail, $sFieldOldpassword, $sFieldNewpassword);
                    $oProvider->SetAllowedEmails(\strtolower(\trim($this->Config()->Get('plugin', 'allowed_emails', ''))));
                }

                break;
        }
    }

    /**
     * @return array
     */
    public function configMapping()
    {
        return array(
            \RainLoop\Plugins\Property::NewInstance('rest_url')
                ->SetLabel('REST API Url')
                ->SetDefaultValue('')
                ->SetDescription('Ex: http://localhost:8080/api/change_password or https://domain.com/api/user/passsword_update'),
            \RainLoop\Plugins\Property::NewInstance('rest_key')
                ->SetLabel('REST API key')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
                ->SetDescription('REST API Key for authentication, if you have "user" and "passsword" enter it as "user:password"')
                ->SetDefaultValue(''),
            \RainLoop\Plugins\Property::NewInstance('rest_field_email')
                ->SetLabel('Field "email" name')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
                ->SetDescription('Enter the name of the REST field name for email')
                ->SetDefaultValue('email'),
            \RainLoop\Plugins\Property::NewInstance('rest_field_oldpassword')
                ->SetLabel('Field "oldpassword" name')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
                ->SetDescription('Enter the name of the REST field name for oldpassword')
                ->SetDefaultValue('oldpassword'),
            \RainLoop\Plugins\Property::NewInstance('rest_field_newpassword')
                ->SetLabel('Field "newpassword" name')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
                ->SetDescription('Enter the name of the REST field name for newpassword')
                ->SetDefaultValue('newpassword'),
            \RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
                ->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
                ->SetDefaultValue('*')
        );
    }
}
