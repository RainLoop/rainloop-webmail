<?php

class VestaChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
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

                $sHost = \trim($this->Config()->Get('plugin', 'vesta_host', ''));
                $iPort = (int) $this->Config()->Get('plugin', 'vesta_port', 8083);

                if (!empty($sHost) && 0 < $iPort)
                {
                    include_once __DIR__.'/VestaChangePasswordDriver.php';

                    $oProvider = new VestaChangePasswordDriver();
                    $oProvider->SetLogger($this->Manager()->Actions()->Logger());
                    $oProvider->SetConfig($sHost, $iPort);
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
            \RainLoop\Plugins\Property::NewInstance('vesta_host')->SetLabel('Vesta Host')
                ->SetDefaultValue('')
                ->SetDescription('Allowed patterns: {user:host-imap}, {user:host-smtp}, {user:domain}'),
            \RainLoop\Plugins\Property::NewInstance('Vesta_port')->SetLabel('Vesta Port')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
                ->SetDefaultValue(8083),
            \RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
                ->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
                ->SetDefaultValue('*')
        );
    }
}
