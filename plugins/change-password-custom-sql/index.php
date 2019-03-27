<?php

class ChangePasswordCustomSqlPlugin extends \RainLoop\Plugins\AbstractPlugin
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
				include_once __DIR__.'/ChangePasswordCustomSqlDriver.php';
				$oProvider = new ChangePasswordCustomSqlDriver();
				$oProvider
					->SetLogger($this->Manager()->Actions()->Logger())
					->SetmHost($this->Config()->Get('plugin', 'mHost', ''))
					->SetmUser($this->Config()->Get('plugin', 'mUser', ''))
					->SetmPass($this->Config()->Get('plugin', 'mPass', ''))
					->SetmDatabase($this->Config()->Get('plugin', 'mDatabase', ''))
					->SetmTable($this->Config()->Get('plugin', 'mTable', ''))
					->SetmSql($this->Config()->Get('plugin', 'mSql', ''))
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
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD),
			\RainLoop\Plugins\Property::NewInstance('mDatabase')->SetLabel('MySQL Database'),
			\RainLoop\Plugins\Property::NewInstance('mTable')->SetLabel('MySQL Table'),
			\RainLoop\Plugins\Property::NewInstance('mSql')->SetLabel('SQL statement')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('SQL statement (allowed wildcards :table, :email, :oldpass, :newpass, :domain, :username). Use SQL functions for encryption.')
				->SetDefaultValue('UPDATE :table SET password = md5(:newpass) WHERE domain = :domain AND username = :username and oldpass = md5(:oldpass)')
		);
	}
}
