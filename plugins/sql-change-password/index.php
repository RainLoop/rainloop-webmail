<?php

class SQLChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
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
			return 'The PHP exention PDO (mysql) must be installed to use this plugin';
		}

		$aDrivers = \PDO::getAvailableDrivers();
		if (!is_array($aDrivers) || !in_array('mysql', $aDrivers))
		{
			return 'The PHP exention PDO (mysql) must be installed to use this plugin';
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

				$sDsn = \trim($this->Config()->Get('plugin', 'pdo_dsn', ''));
				$sUser = (string) $this->Config()->Get('plugin', 'user', '');
				$sPassword = (string) $this->Config()->Get('plugin', 'password', '');
				$sdbotable = (string) $this->Config()->Get('plugin', 'dbotable', '');
				$sdbofieldUserid = (string) $this->Config()->Get('plugin', 'dbofieldUserid', '');
				$sdbofieldUsername = (string) $this->Config()->Get('plugin', 'dbofieldUsername', '');
				$sdbofieldPassword = (string) $this->Config()->Get('plugin', 'dbofieldPassword', '');

				if (!empty($sDsn) && 0 < \strlen($sUser) && 0 < \strlen($sPassword))
				{
					include_once __DIR__.'/SQLChangePasswordDriver.php';

					$oProvider = new SQLChangePasswordDriver();
					$oProvider->SetLogger($this->Manager()->Actions()->Logger());
					$oProvider->SetConfig($sDsn, $sUser, $sPassword, $sdbotable, $sdbofieldUserid, $sdbofieldUsername, $sdbofieldPassword);
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
			\RainLoop\Plugins\Property::NewInstance('pdo_dsn')->SetLabel('Database PDO dsn')
				->SetDescription('SQL Database Connection string to the database. Example: mysql:host=127.0.0.1;dbname=database')
				->SetDefaultValue('mysql:host=127.0.0.1;dbname=database'),
			\RainLoop\Plugins\Property::NewInstance('dbotable')->SetLabel('DB Table')
				->SetDefaultValue('mail_user'),
			\RainLoop\Plugins\Property::NewInstance('user')->SetLabel('DB User')
				->SetDefaultValue('root'),
			\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('DB Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
						
			\RainLoop\Plugins\Property::NewInstance('dbofieldUserid')->SetLabel('DB UserID Field')
				->SetDescription('The field where the userID is stored.')
				->SetDefaultValue('id'),
			\RainLoop\Plugins\Property::NewInstance('dbofieldUsername')->SetLabel('DB Username Field')
				->SetDescription('The field with the username.')
				->SetDefaultValue('username'),
			\RainLoop\Plugins\Property::NewInstance('dbofieldPassword')->SetLabel('DB Password Field')
				->SetDescription('The field where the user\'s password is stored.')
				->SetDefaultValue('password'),
			
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}
}