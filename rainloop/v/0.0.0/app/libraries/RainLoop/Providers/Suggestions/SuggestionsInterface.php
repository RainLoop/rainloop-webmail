<?php

namespace RainLoop\Providers\Suggestions;

interface SuggestionsInterface
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 *
	 * @return array
	 */
	public function Process(\RainLoop\Model\Account $oAccount, $sQuery);
}