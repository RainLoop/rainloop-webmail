<?php

namespace RainLoop\Providers\Filters;

interface FiltersInterface
{
	/**
	 * @param \RainLoop\Account $oAccount
	 * @param bool $bAllowRaw = false
	 *
	 * @return array
	 */
	public function Load($oAccount, $bAllowRaw = false);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aFilters
	 *
	 * @return bool
	 */
	public function Save($oAccount, $aFilters);
}
