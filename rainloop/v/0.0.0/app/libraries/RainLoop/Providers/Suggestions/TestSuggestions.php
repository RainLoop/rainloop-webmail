<?php

namespace RainLoop\Providers\Suggestions;

class TestSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function Process($oAccount, string $sQuery, int $iLimit = 20) : array
	{
		return array(
			array($oAccount->Email(), ''),
			array('email@domain.com', 'name')
		);
	}
}
