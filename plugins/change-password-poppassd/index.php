<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordPoppassdPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password Poppassd',
		VERSION  = '2.16',
		RELEASE  = '2022-05-20',
		REQUIRED = '2.15.3',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through Poppassd';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
