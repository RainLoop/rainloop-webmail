<?php

namespace Plugins\Example;

class ContactSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	public function Process(\RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20) : array
	{
		return array(
			array($oAccount->Email(), ''),
			array('email@domain.com', 'name')
		);
	}
}
