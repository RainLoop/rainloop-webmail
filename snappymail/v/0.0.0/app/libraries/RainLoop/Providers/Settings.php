<?php

namespace RainLoop\Providers;

use RainLoop\Model\Account;
use RainLoop\Providers\Settings\ISettings;

class Settings extends \RainLoop\Providers\AbstractProvider
{
	private ISettings $oDriver;

	public function __construct(ISettings $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	public function Load(Account $oAccount) : \RainLoop\Settings
	{
		return new \RainLoop\Settings($this, $oAccount, $this->oDriver->Load($oAccount));
	}

	public function Save(Account $oAccount, \RainLoop\Settings $oSettings) : bool
	{
		return $this->oDriver->Save($oAccount, $oSettings);
	}

	public function IsActive() : bool
	{
		return true;
	}
}
