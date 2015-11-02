<?php

namespace RainLoop\Providers\Suggestions;

class OwnCloudSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function Process($oAccount, $sQuery, $iLimit = 20)
	{
		$iInputLimit = $iLimit;
		$aResult = array();
		$sQuery = \trim($sQuery);

		try
		{
			if ('' === $sQuery || !$oAccount || !\RainLoop\Utils::IsOwnCloudLoggedIn() ||
				!\class_exists('OCP\Contacts') || !\OCP\Contacts::isEnabled()
			)
			{
				return $aResult;
			}

			$aSearchResult = \OCP\Contacts::search($sQuery, array('FN', 'EMAIL'));
			//$this->oLogger->WriteDump($aSearchResult);

			$aHashes = array();
			if (\is_array($aSearchResult) && 0 < \count($aSearchResult))
			{
				foreach ($aSearchResult as $aContact)
				{
					if (0 >= $iLimit)
					{
						break;
					}

					$sUid = empty($aContact['UID']) ? '' : $aContact['UID'];
					if (!empty($sUid))
					{
						$sFullName = isset($aContact['FN']) ? \trim($aContact['FN']) : '';
						$mEmails = isset($aContact['EMAIL']) ? $aContact['EMAIL'] : '';

						if (!\is_array($mEmails))
						{
							$mEmails = array($mEmails);
						}

						foreach ($mEmails as $sEmail)
						{
							$sHash = '"'.$sFullName.'" <'.$sEmail.'>';
							if (!isset($aHashes[$sHash]))
							{
								$aHashes[$sHash] = true;
								$aResult[] = array($sEmail, $sFullName);
								$iLimit--;
							}
						}
					}
				}

				$aResult = \array_slice($aResult, 0, $iInputLimit);
			}

			unset($aSearchResult, $aHashes);
		}
		catch (\Exception $oException)
		{
			if ($this->oLogger)
			{
				$this->oLogger->WriteException($oException);
			}
		}

		return $aResult;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 */
	public function SetLogger($oLogger)
	{
		$this->oLogger = $oLogger instanceof \MailSo\Log\Logger ? $oLogger : null;
	}
}
