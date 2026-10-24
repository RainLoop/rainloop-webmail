<?php

class ChangePasswordMailcowPlugin extends \RainLoop\Plugins\AbstractPlugin
{
    const
        NAME     = 'Change Password Mailcow',
        AUTHOR   = 'Cuttlefish',
        VERSION  = '2.36',
        RELEASE  = '2024-07-25',
        REQUIRED = '2.36.0',
        CATEGORY = 'Security',
        DESCRIPTION = 'Extension to allow users to change their passwords through Mailcow';

    public function Supported() : string
    {
        return 'Use Change Password plugin';
    }
}
