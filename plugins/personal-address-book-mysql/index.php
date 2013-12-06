<?php

class PersonalAddressBookMysqlPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	/**
	 * @return void
	 */
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
		if (!$oProvider && 'personal-address-book' === $sName &&
			$this->Config()->Get('plugin', 'enabled', false))
		{
			$sDsn = \trim($this->Config()->Get('plugin', 'pdo_dsn', ''));
			$sUser = \trim($this->Config()->Get('plugin', 'user', ''));
			$sPassword = (string) $this->Config()->Get('plugin', 'password', '');

			include_once __DIR__.'/MySqlPersonalAddressBookDriver.php';

			$oProvider = new MySqlPersonalAddressBookDriver($sDsn, $sUser, $sPassword);
			$oProvider->SetLogger($this->Manager()->Actions()->Logger());
		}
	}
	
	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('enabled')->SetLabel('Enable')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false),
			\RainLoop\Plugins\Property::NewInstance('pdo_dsn')->SetLabel('PDO dsn')
				->SetDefaultValue('mysql:host=127.0.0.1;port=3306;dbname=rainloop'),
			\RainLoop\Plugins\Property::NewInstance('user')->SetLabel('DB User')
				->SetDefaultValue('root'),
			\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('DB Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue('')
		);
	}
}
