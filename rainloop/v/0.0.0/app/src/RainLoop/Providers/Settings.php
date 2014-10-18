<?php

namespace RainLoop\Providers;

class Settings extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Settings\SettingsInterface
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Providers\Settings\SettingsInterface $oDriver
	 *
	 * @return void
	 */
	public function __construct(\RainLoop\Providers\Settings\SettingsInterface $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return \RainLoop\Settings
	 */
	public function Load(\RainLoop\Account $oAccount)
	{
		$oSettings = new \RainLoop\Settings();
		$oSettings->InitData($this->oDriver->Load($oAccount));
		return $oSettings;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Settings $oSettings
	 *
	 * @return bool
	 */
	public function Save(\RainLoop\Account $oAccount, \RainLoop\Settings $oSettings)
	{
		return $this->oDriver->Save($oAccount, $oSettings->DataAsArray());
	}

	/**
	 * @param string $sEmail
	 *
	 * @return bool
	 */
	public function ClearByEmail($sEmail)
	{
		return $this->oDriver->ClearByEmail($sEmail);
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Settings\SettingsInterface;
	}
}
