<?php

class ParseExcelListPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	/**
	 * @return void
	 */
	public function Init()
	{
		$this->addJs('js/parse_excel_list.js'); // add js file
	}
}
