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
			return 'The PHP extension COM must be installed to use this plugin';
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
			\RainLoop\Plugins\Property::NewInstance('login')->SetLabel('HmailServer Admin Login')
				->SetDefaultValue('Administrator'),
			\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('HmailServer Admin Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}
}