<?php

class ViewICSPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'View ICS',
		VERSION = '2.1',
		RELEASE  = '2024-02-06',
		CATEGORY = 'Messages',
		DESCRIPTION = 'Display ICS attachment or JSON-LD details',
		REQUIRED = '2.34.0';

	public function Init() : void
	{
//		$this->UseLangs(true);
		$this->addJs('message.js');
	}
}
