<?php

use RainLoop\Exceptions\ClientException;

class ChangePasswordHestiaPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password Hestia',
		AUTHOR   = 'Jaap Marcus',
		VERSION  = '2.36',
		RELEASE  = '2024-03-17',
		REQUIRED = '2.36.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through HestiaCP';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
