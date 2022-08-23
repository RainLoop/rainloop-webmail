<?php

namespace RainLoop\Providers\Filters;

interface FiltersInterface
{
	public function Load(\RainLoop\Model\Account $oAccount) : array;

	public function Save(\RainLoop\Model\Account $oAccount, string $sScriptName, string $sRaw) : bool;

	public function Activate(\RainLoop\Model\Account $oAccount, string $sScriptName) : bool;

	public function Delete(\RainLoop\Model\Account $oAccount, string $sScriptName) : bool;
}
