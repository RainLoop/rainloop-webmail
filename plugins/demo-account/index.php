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
		$this->addHook('main.fabrica[2]', 'MainFabrica');
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
			$bError = true;
			$oRcpt = $oMessage->GetRcpt();
			if ($oRcpt && 0 < $oRcpt->Count())
			{
				$aRcpt =& $oRcpt->GetAsArray();
				if (0 < \count($aRcpt))
				{
					$bError = false;
					$sCheck = \strtolower(\trim($this->Config()->Get('plugin', 'email')));
					foreach ($aRcpt as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
					{
						if ($sCheck !== \strtolower(\trim($oEmail->GetEmail())))
						{
							$bError = true;
						}
					}
				}
			}

			if ($bError)
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DemoSendMessageError);
			}
		}
	}

	/**
	 * @param string $sName
	 * @param mixed $oDriver
	 */
	public function MainFabrica($sName, &$oDriver, $oAccount)
	{
		switch ($sName)
		{
			case 'settings':
			case 'settings-local':
				if ($oAccount && \class_exists('\\RainLoop\\Providers\\Storage\\TemproryApcStorage') &&
					\function_exists('apc_store') &&
					$this->isDemoAccount($oAccount))
				{
					$oDriver = new \RainLoop\Providers\Storage\TemproryApcStorage(APP_PRIVATE_DATA.'storage',
						$sName === 'settings-local');
				}
				break;
		}
	}
}

