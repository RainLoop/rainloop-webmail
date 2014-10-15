<?php

namespace RainLoop\Providers\Settings;

interface SettingsInterface
{
	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return array
	 */
	public function Load(\RainLoop\Account $oAccount);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aSettings
	 *
	 * @return bool
	 */
	public function Save(\RainLoop\Account $oAccount, array $aSettings);

	/**
	 * @param string $sEmail
	 *
	 * @return bool
	 */
	public function ClearByEmail($sEmail);
}