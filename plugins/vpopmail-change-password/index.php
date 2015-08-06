<?php

class ChangePasswordVpopmailPlugin extends \RainLoop\Plugins\AbstractPlugin
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

				include_once __DIR__.'/ChangePasswordVpopmailDriver.php';

				$oProvider = new ChangePasswordVpopmailDriver();

				$sDomains = \strtolower(\trim(\preg_replace('/[\s;,]+/', ' ',
					$this->Config()->Get('plugin', 'domains', ''))));

				if (0 < \strlen($sDomains))
				{
					$aDomains = \explode(' ', $sDomains);
					$oProvider->SetAllowedDomains($aDomains);
				}

				$oProvider
						->SetLogger($this->Manager()->Actions()->Logger())
						->SetmHost($this->Config()->Get('plugin', 'mHost', ''))
						->SetmUser($this->Config()->Get('plugin', 'mUser', ''))
						->SetmPass($this->Config()->Get('plugin', 'mPass', ''))
						->SetmDatabase($this->Config()->Get('plugin', 'mDatabase', ''))
						->SetmTable($this->Config()->Get('plugin', 'mTable', ''))
						->SetmColumn($this->Config()->Get('plugin', 'mColumn', ''))
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
			\RainLoop\Plugins\Property::NewInstance('domains')->SetLabel('Allowed Domains')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed domains, space as delimiter')
				->SetDefaultValue('gmail.com yahoo.com'),
			\RainLoop\Plugins\Property::NewInstance('mHost')->SetLabel('MySQL Host')
				->SetDefaultValue('localhost'),
			\RainLoop\Plugins\Property::NewInstance('mUser')->SetLabel('MySQL User')
				->SetDefaultValue('vpopmail'),
			\RainLoop\Plugins\Property::NewInstance('mPass')->SetLabel('MySQL Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD),
			\RainLoop\Plugins\Property::NewInstance('mDatabase')->SetLabel('MySQL Database')
				->SetDefaultValue('vpopmail'),
			\RainLoop\Plugins\Property::NewInstance('mTable')->SetLabel('MySQL Table')
				->SetDefaultValue('vpopmail'),
			\RainLoop\Plugins\Property::NewInstance('mColumn')->SetLabel('MySQL Column')
				->SetDefaultValue('pw_passwd')
		);
	}
}
