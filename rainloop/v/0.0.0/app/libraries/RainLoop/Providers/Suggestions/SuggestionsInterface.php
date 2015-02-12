<?php

namespace RainLoop\Providers\Suggestions;

interface SuggestionsInterface
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function Process($oAccount, $sQuery, $iLimit = 20);
}