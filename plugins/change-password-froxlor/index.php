<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordFroxlorPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password Froxlor',
		AUTHOR   = 'Euphonique',
		VERSION  = '1.0',
		RELEASE  = '2022-05-30',
		REQUIRED = '2.15.3',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through Froxlor';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
