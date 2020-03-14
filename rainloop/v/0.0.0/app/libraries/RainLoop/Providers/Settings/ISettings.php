<?php

namespace RainLoop\Providers\Settings;

interface ISettings
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function Load($oAccount) : array;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function Save($oAccount, array $aSettings) : bool;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function Delete($oAccount) : bool;
}