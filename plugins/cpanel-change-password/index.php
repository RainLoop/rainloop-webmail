<?php

class CpanelChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
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

				$sHost = \trim($this->Config()->Get('plugin', 'host', ''));
				$iPost = (int) $this->Config()->Get('plugin', 'port', 2087);
				$sUser = (string) $this->Config()->Get('plugin', 'user', '');
				$sPassword = (string) $this->Config()->Get('plugin', 'password', '');
				$sSsl = (bool) $this->Config()->Get('plugin', 'ssl', false);

				if (!empty($sHost) && 0 < $iPost && 0 < \strlen($sUser) && 0 < \strlen($sPassword))
				{
					include_once __DIR__.'/CpanelChangePasswordDriver.php';

					$oProvider = new CpanelChangePasswordDriver();
					$oProvider->SetLogger($this->Manager()->Actions()->Logger());
					$oProvider->SetConfig($sHost, $iPost, $sSsl, $sUser, $sPassword);

					$sDomains = \strtolower(\trim(\preg_replace('/[\s;,]+/', ' ',
						$this->Config()->Get('plugin', 'domains', ''))));

					if (0 < \strlen($sDomains))
					{
						$aDomains = \explode(' ', $sDomains);
						$oProvider->SetAllowedDomains($aDomains);
					}
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
			\RainLoop\Plugins\Property::NewInstance('host')->SetLabel('cPanel Host')
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('port')->SetLabel('cPanel Port')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDefaultValue(2087),
			\RainLoop\Plugins\Property::NewInstance('ssl')->SetLabel('Use SSL')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false),
			\RainLoop\Plugins\Property::NewInstance('user')->SetLabel('cPanel User')
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('cPanel Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('domains')->SetLabel('Allowed Domains')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed domains, space as delimiter')
				->SetDefaultValue('domain1.com domain2.com')
		);
	}
}