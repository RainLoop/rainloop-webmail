<?php

namespace RainLoop\Providers\Suggestions;

interface ISuggestions
{
	/**
	 * @return array [['email@1', 'name_1'], ['email@2', 'name_2']]
	 */
	public function Process(\RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20);
}
