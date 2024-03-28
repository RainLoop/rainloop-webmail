<?php

namespace RainLoop\Providers\Settings;

interface ISettings
{
	public function Load(\RainLoop\Model\Account $oAccount) : array;

	public function Save(\RainLoop\Model\Account $oAccount, \RainLoop\Settings $oSettings) : bool;

	public function Delete(\RainLoop\Model\Account $oAccount) : bool;
}
