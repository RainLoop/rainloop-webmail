<?php

namespace RainLoop\Providers\Suggestions;

class TestSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function Process($oAccount, $sQuery, $iLimit = 20)
	{
		return array(
			array($oAccount->Email(), ''),
			array('email@domain.com', 'name')
		);
	}
}
