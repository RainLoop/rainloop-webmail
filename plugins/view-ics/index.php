<?php

class ViewICSPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'View ICS',
		VERSION = '2.0',
		RELEASE  = '2023-08-28',
		CATEGORY = 'Messages',
		DESCRIPTION = 'Display ICS attachment details',
		REQUIRED = '2.27.0';

	public function Init() : void
	{
//		$this->UseLangs(true);
		$this->addJs('message.js');
	}
}
