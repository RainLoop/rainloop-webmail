<?php

namespace RainLoop\Providers;

class Settings extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Settings\ISettings
	 */
	private $oDriver;

	public function __construct(\RainLoop\Providers\Settings\ISettings $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	public function Load(\RainLoop\Model\Account $oAccount) : \RainLoop\Settings
	{
		return new \RainLoop\Settings($this->oDriver->Load($oAccount));
	}

	public function Save(\RainLoop\Model\Account $oAccount, \RainLoop\Settings $oSettings) : bool
	{
		return $this->oDriver->Save($oAccount, $oSettings);
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\Settings\ISettings;
	}
}
