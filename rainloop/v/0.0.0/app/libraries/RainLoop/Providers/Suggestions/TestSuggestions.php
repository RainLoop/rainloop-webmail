<?php

namespace RainLoop\Providers\Suggestions;

class TestSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 * @param int $iLimit = 20
	 */
	public function Process(\RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20) : array
	{
		return array(
			array($oAccount->Email(), ''),
			array('email@domain.com', 'name')
		);
	}
}
