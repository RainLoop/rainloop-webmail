<?php

class ImapContactsSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	// TODO: make setting
	public $sFolderName = 'INBOX';

	public function Process(\RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20): array
	{
		$sQuery = \trim($sQuery);
		if (2 > \strlen($sQuery)) {
			return [];
		}

		$oActions = \RainLoop\Api::Actions();
		$oMailClient = $oActions->MailClient();
		if (!$oMailClient->IsLoggined()) {
			$oAccount = $oActions->getAccountFromToken();
			$oAccount->ImapConnectAndLoginHelper($oActions->Plugins(), $oMailClient->ImapClient(), $oActions->Config());
		}
		$oImapClient = $oMailClient->ImapClient();

		$oImapClient->FolderSelect($this->sFolderName);

		$sQuery = \MailSo\Imap\SearchCriterias::escapeSearchString($oImapClient, $sQuery);
		$aUids = \array_slice(
			$oImapClient->MessageSimpleSearch("FROM {$sQuery}"),
			0, $iLimit
		);

		$aResult = [];
		if ($aUids) {
			foreach ($oImapClient->Fetch(['BODY.PEEK[HEADER.FIELDS (FROM)]'], \implode(',', $aUids), true) as $oFetchResponse) {
				$oHeaders = new \MailSo\Mime\HeaderCollection($oFetchResponse->GetHeaderFieldsValue());
				$oFrom = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::FROM_, true);
				foreach ($oFrom as $oMail) {
					$aResult[] = [$oMail->GetEmail(), $oMail->GetDisplayName()];
				}
			}
		}

		return $aResult;
	}
}
