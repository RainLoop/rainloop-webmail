<?php

class CustomSettingsTabPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Custom Settings Tab',
		CATEGORY = 'General',
		DESCRIPTION = 'Example extension for custom settings tabs';

	/**
	 * @return void
	 */
	public function Init() : void
	{
		$this->UseLangs(true); // start use langs folder

		$this->addJs('js/CustomUserSettings.js'); // add js file

		$this->addJsonHook('JsonGetCustomUserData', 'JsonGetCustomUserData');
		$this->addJsonHook('JsonSaveCustomUserData', 'JsonSaveCustomUserData');

		$this->addTemplate('templates/PluginCustomSettingsTab.html');
	}

	/**
	 * @return array
	 */
	public function JsonGetCustomUserData()
	{
		$aSettings = $this->getUserSettings();

		$sUserFacebook = isset($aSettings['UserFacebook']) ? $aSettings['UserFacebook'] : '';
		$sUserSkype = isset($aSettings['UserSkype']) ? $aSettings['UserSkype'] : '';

		// or get user's data from your custom storage ( DB / LDAP / ... ).

		\sleep(1);
		return $this->jsonResponse(__FUNCTION__, array(
			'UserFacebook' => $sUserFacebook,
			'UserSkype' => $sUserSkype
		));
	}

	/**
	 * @return array
	 */
	public function JsonSaveCustomUserData()
	{
		$sUserFacebook = $this->jsonParam('UserFacebook');
		$sUserSkype = $this->jsonParam('UserSkype');

		// or put user's data to your custom storage ( DB / LDAP / ... ).

		\sleep(1);
		return $this->jsonResponse(__FUNCTION__, $this->saveUserSettings(array(
			'UserFacebook' => $sUserFacebook,
			'UserSkype' => $sUserSkype
		)));
	}

}

