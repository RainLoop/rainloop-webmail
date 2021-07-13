<?php

class CustomAdminSettingsTabPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = '',
		CATEGORY = 'General',
		DESCRIPTION = '';

	/**
	 * @return void
	 */
	public function Init() : void
	{
		$this->UseLangs(true); // start use langs folder

		$this->addJs('js/CustomAdminSettings.js', true); // add js file

		$this->addJsonHook('JsonAdminGetData', 'JsonAdminGetData');

		$this->addTemplate('templates/PluginCustomAdminSettingsTab.html', true);
	}

	/**
	 * @return array
	 */
	public function JsonAdminGetData()
	{
		return $this->jsonResponse(__FUNCTION__, array(
			'PHP' => phpversion()
		));
	}
}

