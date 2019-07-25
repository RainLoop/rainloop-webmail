<?php

class ChangePasswordCyberPanelPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	/**
	 * @param string $sName
	 * @param mixed $oProvider
	 */
	public function MainFabrica($sName, &$oProvider)
	{
		switch ($sName)
		{
			case 'change-password':
				include_once __DIR__.'/ChangePasswordCyberPanel.php';
				$oProvider = new ChangePasswordCyberPanel();
				$oProvider
					->SetLogger($this->Manager()->Actions()->Logger())
					->SetmHost($this->Config()->Get('plugin', 'mHost', ''))
					->SetmUser($this->Config()->Get('plugin', 'mUser', ''))
					->SetmPass($this->Config()->Get('plugin', 'mPass', ''))
				;
			break;
		}
	}

	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('mHost')->SetLabel('MySQL Host')
				->SetDefaultValue('127.0.0.1'),
			\RainLoop\Plugins\Property::NewInstance('mUser')->SetLabel('MySQL User'),
			\RainLoop\Plugins\Property::NewInstance('mPass')->SetLabel('MySQL Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
		);
	}
}
