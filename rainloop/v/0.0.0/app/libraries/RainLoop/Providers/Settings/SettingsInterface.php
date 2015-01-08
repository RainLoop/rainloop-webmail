<?php

namespace RainLoop\Providers\Settings;

interface SettingsInterface
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return array
	 */
	public function Load($oAccount);

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aSettings
	 *
	 * @return bool
	 */
	public function Save($oAccount, array $aSettings);

	/**
	 * @param string $sEmail
	 *
	 * @return bool
	 */
	public function ClearByEmail($sEmail);
}