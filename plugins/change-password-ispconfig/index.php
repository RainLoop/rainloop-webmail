<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordISPConfigPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password ISPConfig',
		VERSION  = '2.19',
		RELEASE  = '2023-04-11',
		REQUIRED = '2.23.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through ISPConfig';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
