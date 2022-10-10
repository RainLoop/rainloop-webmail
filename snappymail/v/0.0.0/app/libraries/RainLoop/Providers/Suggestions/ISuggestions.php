<?php

namespace RainLoop\Providers\Suggestions;

interface ISuggestions
{
	public function Process(\RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20) : array;
//	public function SetLogger(\MailSo\Log\Logger $oLogger) : void
}
