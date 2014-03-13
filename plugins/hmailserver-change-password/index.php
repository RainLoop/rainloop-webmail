<?php

class HmailserverChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	/**
	 * @return string
	 */
	public function Supported()
	{
		if (!class_exists('COM'))
		{
			return 'The PHP exention COM must be installed to use this plugin';
		}

		return '';
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

				$sLogin = (string) $this->Config()->Get('plugin', 'login', '');
				$sPassword = (string) $this->Config()->Get('plugin', 'password', '');

				if (0 < \strlen($sLogin) && 0 < \strlen($sPassword))
				{
					include_once __DIR__.'/HmailserverChangePasswordDriver.php';

					$oProvider = new HmailserverChangePasswordDriver();
					$oProvider->SetLogger($this->Manager()->Actions()->Logger());
					$oProvider->SetConfig($sLogin, $sPassword);

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
			\RainLoop\Plugins\Property::NewInstance('login')->SetLabel('HmailServer Admin Login')
				->SetDefaultValue('Administrator'),
			\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('HmailServer Admin Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('domains')->SetLabel('Allowed Domains')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed domains, space as delimiter')
				->SetDefaultValue('domain1.com domain2.com')
		);
	}
}