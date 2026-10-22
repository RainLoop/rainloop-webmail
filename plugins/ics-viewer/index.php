<?php

class ICSViewerPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'ICS Viewer',
		AUTHOR = 'PhieF',
		VERSION = '1.1',
		RELEASE  = '2026-10-22',
		CATEGORY = 'Messages',
		DESCRIPTION = 'Display ICS attachment using ical lib, or JSON-LD details, based on viewICS',
		REQUIRED = '2.34.0';

	public function Init() : void
	{
//		$this->UseLangs(true);
		$this->addJs('message.js');
		$this->addJs('windowsZones.js');
		// Load https://github.com/kewisch/ical.js/releases
		$this->addJs('ical.js');
	}
}
