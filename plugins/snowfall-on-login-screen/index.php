<?php

class SnowfallOnLoginScreenPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addJs('js/snowfall.js');
		$this->addJs('js/include.js');
	}
}
