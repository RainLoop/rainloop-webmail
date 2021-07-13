<?php

namespace RainLoop\Providers\Suggestions;

use RainLoop\Model\Account;

class TestSuggestions implements ISuggestions
{
	public function Process(Account $oAccount, string $sQuery, int $iLimit = 20) : array
	{
		return array(
			array($oAccount->Email(), ''),
			array('email@domain.com', 'name')
		);
	}
}
