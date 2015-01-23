<?php

namespace RainLoop\Providers;

class Filters extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Filters\FiltersInterface
	 */
	private $oDriver;

	/**
	 * @return void
	 */
	public function __construct($oDriver)
	{
		$this->oDriver = $oDriver instanceof \RainLoop\Providers\Filters\FiltersInterface ? $oDriver : null;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param bool $bAllowRaw = false
	 *
	 * @return array
	 */
	public function Load($oAccount, $bAllowRaw = false)
	{
		return $this->IsActive() ? $this->oDriver->Load($oAccount, $bAllowRaw) : array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aFilters
	 * @param string $sRaw = ''
	 * @param bool $bRawIsActive = false
	 *
	 * @return bool
	 */
	public function Save($oAccount, $aFilters, $sRaw = '', $bRawIsActive = false)
	{
		return $this->IsActive() ? $this->oDriver->Save($oAccount,
			$aFilters, $sRaw, $bRawIsActive) : false;
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Filters\FiltersInterface;
	}
}