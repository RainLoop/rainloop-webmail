<?php

class ContactGroupExcelPastePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addJs('js/excel_contact_group.js');
	}
}
