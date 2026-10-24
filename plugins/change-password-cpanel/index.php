<?php

class ChangePasswordCPanelPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password cPanel',
		VERSION  = '2.36',
		RELEASE  = '2024-03-17',
		REQUIRED = '2.36.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords through cPanel';

	public function Supported() : string
	{
		return 'Use Change Password plugin';
	}
}
