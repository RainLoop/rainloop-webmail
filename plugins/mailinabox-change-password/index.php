<?php
/*
 * Mail-in-a-box Password Change Plugin
 *
 * Based on VirtualminChangePassword
 *
 * Author: Marius Gripsgard
 */
class MailInABoxChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
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
				include_once __DIR__.'/MailInABoxChangePasswordDriver.php';
				$sHost = \trim($this->Config()->Get('plugin', 'host', ''));
				$sAdminUser = (string) $this->Config()->Get('plugin', 'admin_user', '');
				$sAdminPassword = (string) $this->Config()->Get('plugin', 'admin_password', '');
				$oProvider = new \MailInABoxChangePasswordDriver();
				$oProvider->SetLogger($this->Manager()->Actions()->Logger());
				$oProvider->SetConfig($sHost, $sAdminUser, $sAdminPassword);
				$oProvider->SetAllowedEmails(\strtolower(\trim($this->Config()->Get('plugin', 'allowed_emails', ''))));
				break;
		}
	}
	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('host')->SetLabel('Mail-in-a-box Host')
					->SetDefaultValue('https://box.mailinabox.email')
					->SetDescription('Mail-in-a-box host URL. Example: https://box.mailinabox.email'),
			\RainLoop\Plugins\Property::NewInstance('admin_user')->SetLabel('Admin User')
					->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('admin_password')->SetLabel('Admin Password')
					->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}
}
