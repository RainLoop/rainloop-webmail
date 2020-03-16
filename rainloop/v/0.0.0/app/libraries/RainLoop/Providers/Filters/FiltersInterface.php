<?php

namespace RainLoop\Providers\Filters;

interface FiltersInterface
{
	public function Load(\RainLoop\Model\Account $oAccount, bool $bAllowRaw = false) : array;

	public function Save(\RainLoop\Model\Account $oAccount, array $aFilters) : bool;
}
