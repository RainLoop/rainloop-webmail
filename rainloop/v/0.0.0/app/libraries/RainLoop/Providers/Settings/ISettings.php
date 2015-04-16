<?php

namespace RainLoop\Providers\Settings;

interface ISettings
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
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return bool
	 */
	public function Delete($oAccount);
}