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
	 * @return array
	 */
	public function Load()
	{
		return $this->IsActive() ? $this->oDriver->Load() : array();
	}

	/**
	 * @param array $aFilters
	 *
	 * @return bool
	 */
	public function Save($aFilters)
	{
		return $this->IsActive() ? $this->oDriver->Save($aFilters) : false;
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Filters\FiltersInterface;
	}
}