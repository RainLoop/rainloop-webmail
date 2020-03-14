<?php

namespace RainLoop\Providers\Suggestions;

interface ISuggestions
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function Process($oAccount, string $sQuery, int $iLimit = 20) : array;
}