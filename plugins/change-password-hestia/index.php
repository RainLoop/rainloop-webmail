<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordHestiaPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password Hestia',
		AUTHOR   = 'Jaap Marcus',
		VERSION  = '1.0',
		RELEASE  = '2022-06-02',
		REQUIRED = '2.16.3',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through HestiaCP';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
