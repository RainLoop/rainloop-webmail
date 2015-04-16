<?php

class DemoAccountPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	/**
	 * @return void
	 */
	public function Init()
	{
		$this->addHook('filter.app-data', 'FilterAppData');
		$this->addHook('filter.action-params', 'FilterActionParams');
		$this->addHook('ajax.action-pre-call', 'AjaxActionPreCall');
		$this->addHook('filter.send-message', 'FilterSendMessage');
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	/**
	 * @return array
	 */
	protected function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('email')->SetLabel('Demo Email')
				->SetDefaultValue('demo@domain.com'),
			\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('Demo Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
		);
	}

	/**
	 * @return void
	 */
	public function FilterAppData($bAdmin, &$aResult)
	{
		if (!$bAdmin && \is_array($aResult) && isset($aResult['Auth']) && !$aResult['Auth'])
		{
			$aResult['DevEmail'] = $this->Config()->Get('plugin', 'email', $aResult['DevEmail']);
			$aResult['DevPassword'] = APP_DUMMY;
		}
	}

	/**
	 * @return void
	 */
	public function FilterActionParams($sMethodName, &$aActionParams)
	{
		if ('DoLogin' === $sMethodName && isset($aActionParams['Email']) && isset($aActionParams['Password']))
		{
			if ($this->Config()->Get('plugin', 'email') === $aActionParams['Email'])
			{
				$aActionParams['Password'] = $this->Config()->Get('plugin', 'password');
			}
		}
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return bool
	 */
	public function isDemoAccount($oAccount)
	{
		return ($oAccount && $oAccount->Email() === $this->Config()->Get('plugin', 'email'));
	}

	public function AjaxActionPreCall($sAction)
	{
		if ('AccountSetup' === $sAction &&
			$this->isDemoAccount($this->Manager()->Actions()->GetAccount()))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoAccountError);
		}
	}

	public function FilterSendMessage(&$oMessage)
	{
		if ($oMessage && $this->isDemoAccount($this->Manager()->Actions()->GetAccount()))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoSendMessageError);
		}
	}

	/**
	 * @param string $sName
	 * @param mixed $oDriver
	 */
	public function MainFabrica($sName, &$oDriver)
	{
		switch ($sName)
		{
			case 'storage':
			case 'storage-local':
				if (\class_exists('\\RainLoop\\Providers\\Storage\\TemproryApcStorage') &&
					\function_exists('apc_store'))
				{
					$oAccount = $this->Manager()->Actions()->GetAccount();
					if ($this->isDemoAccount($oAccount))
					{
						$oDriver = new \RainLoop\Providers\Storage\TemproryApcStorage(APP_PRIVATE_DATA.'storage',
							$sName === 'storage-local');
					}
				}
				break;
		}
	}
}

