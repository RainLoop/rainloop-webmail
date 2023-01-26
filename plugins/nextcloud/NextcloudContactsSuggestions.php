<?php

class NextcloudContactsSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	public function Process(\RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20): array
	{
		try
		{
			$sQuery = \trim($sQuery);
			if ('' === $sQuery) {
				return [];
			}

			$cm = \OC::$server->getContactsManager();
			if (!$cm || !$cm->isEnabled()) {
				return [];
			}

			// Unregister system addressbook so as to return only contacts in user's addressbooks
			foreach($cm->getUserAddressBooks() as $addressBook) {
				if($addressBook->isSystemAddressBook()) {
		   			 $cm->unregisterAddressBook($addressBook);
				}
			}
			$aSearchResult = $cm->search($sQuery, array('FN', 'NICKNAME', 'TITLE', 'EMAIL'));

			//$this->oLogger->WriteDump($aSearchResult);

			if (\is_array($aSearchResult) && 0 < \count($aSearchResult)) {
				$iInputLimit = $iLimit;
				$aResult = array();
				foreach ($aSearchResult as $aContact) {
					if (0 >= $iLimit) {
						break;
					}
					if (!empty($aContact['UID'])) {
						$sUid = $aContact['UID'];
						$mEmails = isset($aContact['EMAIL']) ? $aContact['EMAIL'] : '';

						$sFullName = isset($aContact['FN']) ? \trim($aContact['FN']) : '';
						if (empty($sFullName) && isset($aContact['NICKNAME'])) {
							$sFullName = \trim($aContact['NICKNAME']);
						}

						if (!\is_array($mEmails)) {
							$mEmails = array($mEmails);
						}

						foreach ($mEmails as $sEmail) {
							$sHash = $sFullName.'|'.$sEmail;
							if (!isset($aResult[$sHash])) {
								$aResult[$sHash] = array($sEmail, $sFullName);
								--$iLimit;
							}
						}
					}
				}
				return \array_slice(\array_values($aResult), 0, $iInputLimit);
			}
		}
		catch (\Exception $oException)
		{
			if ($this->oLogger) {
				$this->oLogger->WriteException($oException);
			}
		}

		return [];
	}

	public function SetLogger(\MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
	}
}
