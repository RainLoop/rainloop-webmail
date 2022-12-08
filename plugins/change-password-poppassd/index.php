<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordPoppassdPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password Poppassd',
		VERSION  = '2.18',
		RELEASE  = '2022-12-08',
		REQUIRED = '2.23.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through Poppassd';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
