<?php

namespace RainLoop\Providers\Settings;

interface SettingsInterface
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return array
	 */
	public function Load(\RainLoop\Model\Account $oAccount);

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aSettings
	 *
	 * @return bool
	 */
	public function Save(\RainLoop\Model\Account $oAccount, array $aSettings);

	/**
	 * @param string $sEmail
	 *
	 * @return bool
	 */
	public function ClearByEmail($sEmail);
}