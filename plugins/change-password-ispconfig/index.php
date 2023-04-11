<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordISPConfigPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password ISPConfig',
		VERSION  = '2.14',
		RELEASE  = '2022-04-28',
		REQUIRED = '2.28.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through ISPConfig';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
