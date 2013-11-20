<?php

class ChangePasswordExamplePlugin extends \RainLoop\Plugins\AbstractPlugin
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

				include_once __DIR__.'/ChangePasswordExampleDriver.php';

				$oProvider = new ChangePasswordExampleDriver();

				$sDomains = \strtolower(\trim(\preg_replace('/[\s;,]+/', ' ',
					$this->Config()->Get('plugin', 'domains', ''))));

				if (0 < \strlen($sDomains))
				{
					$aDomains = \explode(' ', $sDomains);
					$oProvider->SetAllowedDomains($aDomains);
				}
				
				break;
		}
	}

	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('domains')->SetLabel('Allowed Domains')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed domains, space as delimiter')
				->SetDefaultValue('domain1.com domain2.com')
		);
	}
}