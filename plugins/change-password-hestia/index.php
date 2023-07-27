<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordHestiaPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password Hestia',
		AUTHOR   = 'Jaap Marcus',
		VERSION  = '1.2',
		RELEASE  = '2023-05-16',
		REQUIRED = '2.16.3',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through HestiaCP';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
