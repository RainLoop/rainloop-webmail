<?php

class CustomAdminSettingsTabPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	/**
	 * @return void
	 */
	public function Init() : void
	{
		$this->UseLangs(true); // start use langs folder

		$this->addJs('js/CustomAdminSettings.js', true); // add js file

		$this->addAjaxHook('AjaxAdminGetData', 'AjaxAdminGetData');

		$this->addTemplate('templates/PluginCustomAdminSettingsTab.html', true);
	}

	/**
	 * @return array
	 */
	public function AjaxAdminGetData()
	{
		return $this->ajaxResponse(__FUNCTION__, array(
			'PHP' => phpversion()
		));
	}
}

