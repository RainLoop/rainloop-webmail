<?php

class DemoAccountPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Demo Account Extension',
		CATEGORY = 'Login',
		DESCRIPTION = 'Extension to enable a demo account';

	/**
	 * @return void
	 */
	public function Init() : void
	{
		$this->addHook('filter.app-data', 'FilterAppData');
		$this->addHook('filter.action-params', 'FilterActionParams');
		$this->addHook('json.action-pre-call', 'JsonActionPreCall');
		$this->addHook('filter.send-message', 'FilterSendMessage');
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
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
		if (!$bAdmin && \is_array($aResult) && isset($aResult['Auth']) && !$aResult['Auth']) {
			$aResult['DevEmail'] = $this->Config()->Get('plugin', 'email', $aResult['DevEmail']);
			$aResult['DevPassword'] = APP_DUMMY;
		}
	}

	/**
	 * @return void
	 */
	public function FilterActionParams($sMethodName, &$aActionParams)
	{
		if ('DoLogin' === $sMethodName
		 && isset($aActionParams['Email'])
		 && isset($aActionParams['Password'])
		 && $this->Config()->Get('plugin', 'email') === $aActionParams['Email']) {
			$aActionParams['Password'] = $this->Config()->Get('plugin', 'password');
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

	public function JsonActionPreCall($sAction)
	{
		if ('AccountSetup' === $sAction && $this->isDemoAccount($this->Manager()->Actions()->GetAccount())) {
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoAccountError);
		}
	}

	public function FilterSendMessage($oMessage)
	{
		if ($oMessage && $this->isDemoAccount($this->Manager()->Actions()->GetAccount())) {
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoSendMessageError);
		}
	}

	/**
	 * @param string $sName
	 * @param mixed $oDriver
	 */
	public function MainFabrica($sName, &$oDriver)
	{
		if (('storage' === $sName || 'storage-local' === $sName) && \function_exists('apcu_store')) {
			$oAccount = $this->Manager()->Actions()->GetAccount();
			if ($this->isDemoAccount($oAccount)) {
				require_once __DIR__ . '/storage.php';
				$oDriver = new \DemoStorage(APP_PRIVATE_DATA.'storage', $sName === 'storage-local');
			}
		}
	}
}

