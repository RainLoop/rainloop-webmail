<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordHMailServerPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password hMailServer',
		VERSION  = '2.1',
		RELEASE  = '2024-03-12',
		REQUIRED = '2.35.3',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through hMailServer';

	public function Supported() : string
	{
		return 'Activate in Change Password plugin'
			. (\class_exists('COM') ? '' : '. And you must install PHP COM extension');
	}
}
