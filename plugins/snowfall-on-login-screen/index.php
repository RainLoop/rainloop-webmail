<?php

class SnowfallOnLoginScreenPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Snowfall on login screen',
		VERSION = '2.1',
		CATEGORY = 'Fun',
		DESCRIPTION = 'Snowfall on login screen (just for fun).';

	public function Init() : void
	{
		$this->addJs('js/snowfall.js');
		$this->addJs('js/include.js');
	}
}
