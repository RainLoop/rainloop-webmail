<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordHMailServerPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password hMailServer',
		VERSION  = '2.0',
		RELEASE  = '2022-10-14',
		REQUIRED = '2.15.3',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through hMailServer';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
