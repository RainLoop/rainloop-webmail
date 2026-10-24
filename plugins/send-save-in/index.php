<?php

class SendSaveInPlugin extends \RainLoop\Plugins\AbstractPlugin
{
//	use \MailSo\Log\Inherit;

	const
		NAME     = 'Send Save In',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '0.1',
		RELEASE  = '2024-10-08',
		REQUIRED = '2.38.1',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = 'When composing a message, select the save folder';

	public function Init() : void
	{
//		$this->UseLangs(true); // start use langs folder
		$this->addJs('savein.js');
	}
}
