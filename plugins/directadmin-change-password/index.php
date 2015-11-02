<?php

class DirectadminChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
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

				$sHost = \trim($this->Config()->Get('plugin', 'direct_admin_host', ''));
				$iPort = (int) $this->Config()->Get('plugin', 'direct_admin_port', 2222);

				if (!empty($sHost) && 0 < $iPort)
				{
					include_once __DIR__.'/DirectAdminChangePasswordDriver.php';

					$oProvider = new DirectAdminChangePasswordDriver();
					$oProvider->SetLogger($this->Manager()->Actions()->Logger());
					$oProvider->SetConfig($sHost, $iPort);
					$oProvider->SetAllowedEmails(\strtolower(\trim($this->Config()->Get('plugin', 'allowed_emails', ''))));
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
			\RainLoop\Plugins\Property::NewInstance('direct_admin_host')->SetLabel('DirectAdmin Host')
				->SetDefaultValue('')
				->SetDescription('Allowed patterns: {user:host-imap}, {user:host-smtp}, {user:domain}'),
			\RainLoop\Plugins\Property::NewInstance('direct_admin_port')->SetLabel('DirectAdmin Port')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDefaultValue(2222),
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}
}