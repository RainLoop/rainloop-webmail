<?php

namespace RainLoop\Providers\Filters;

interface FiltersInterface
{
	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 */
	public function Load($oAccount, bool $bAllowRaw = false) : array;

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 */
	public function Save($oAccount, array $aFilters) : bool;
}
