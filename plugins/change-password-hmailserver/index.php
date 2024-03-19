<?php

class ChangePasswordHMailServerPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password hMailServer',
		VERSION  = '2.36',
		RELEASE  = '2024-03-17',
		REQUIRED = '2.36.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through hMailServer';

	public function Supported() : string
	{
		return 'Activate in Change Password plugin'
			. (\class_exists('COM') ? '' : '. And you must install PHP COM extension');
	}
}
