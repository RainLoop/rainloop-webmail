<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordPoppassdPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password Poppassd',
		VERSION  = '2.19',
		RELEASE  = '2023-06-05',
		REQUIRED = '2.28.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through Poppassd';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
