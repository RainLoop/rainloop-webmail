<?php

namespace RainLoop\Providers\Suggestions;

interface SuggestionsInterface
{
	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sQuery
	 *
	 * @return array
	 */
	public function Process(\RainLoop\Account $oAccount, $sQuery);
}