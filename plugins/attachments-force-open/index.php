<?php

class AttachmentsForceOpenPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Attachments force open',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://github.com/the-djmaze/snappymail/pull/1489',
		VERSION  = '0.1',
		RELEASE  = '2024-03-15',
		REQUIRED = '2.14.0',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = '';

	public function Init() : void
	{
		$this->addJs('extension.js'); // add js file
	}
}
