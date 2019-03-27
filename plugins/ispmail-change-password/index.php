<?php

class IspmailChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
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
		if (!extension_loaded('pdo') || !class_exists('PDO'))
		{
			return 'The PHP extension PDO (mysql) must be installed to use this plugin';
		}

		$aDrivers = \PDO::getAvailableDrivers();
		if (!is_array($aDrivers) || !in_array('mysql', $aDrivers))
		{
			return 'The PHP extension PDO (mysql) must be installed to use this plugin';
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

				include_once __DIR__.'/ChangePasswordISPmailDriver.php';

				$oProvider = new ChangePasswordISPmailDriver();

				$oProvider
					->SetHost($this->Config()->Get('plugin', 'host', ''))
					->SetPort((int) $this->Config()->Get('plugin', 'port', 3306))
					->SetDatabase($this->Config()->Get('plugin', 'database', ''))
					->SetTable($this->Config()->Get('plugin', 'table', ''))
					->SetUserColumn($this->Config()->Get('plugin', 'usercol', ''))
					->SetPasswordColumn($this->Config()->Get('plugin', 'passcol', ''))
					->SetUser($this->Config()->Get('plugin', 'user', ''))
					->SetPassword($this->Config()->Get('plugin', 'password', ''))
					->SetEncrypt($this->Config()->Get('plugin', 'encrypt', ''))
					->SetAllowedEmails(\strtolower(\trim($this->Config()->Get('plugin', 'allowed_emails', ''))))
					->SetLogger($this->Manager()->Actions()->Logger())
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
			\RainLoop\Plugins\Property::NewInstance('host')->SetLabel('MySQL Host')
				->SetDefaultValue('127.0.0.1'),
			\RainLoop\Plugins\Property::NewInstance('port')->SetLabel('MySQL Port')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDefaultValue(3306),
			\RainLoop\Plugins\Property::NewInstance('database')->SetLabel('MySQL Database')
				->SetDefaultValue('mailserver'),
			\RainLoop\Plugins\Property::NewInstance('table')->SetLabel('MySQL table')
				->SetDefaultValue('virtual_users'),
			\RainLoop\Plugins\Property::NewInstance('usercol')->SetLabel('MySQL username column')
				->SetDefaultValue('email'),
			\RainLoop\Plugins\Property::NewInstance('passcol')->SetLabel('MySQL password column')
				->SetDefaultValue('password'),
			\RainLoop\Plugins\Property::NewInstance('user')->SetLabel('MySQL User')
				->SetDefaultValue('mailuser'),
			\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('MySQL Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('encrypt')->SetLabel('Encrypt')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array('PLAIN-MD5', 'SHA256-CRYPT'))
				->SetDescription('In what way do you want the passwords to be crypted ?'),
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}
}
