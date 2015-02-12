<?php

namespace RainLoop\Providers\Suggestions;

class OwnCloudSuggestions implements \RainLoop\Providers\Suggestions\SuggestionsInterface
{
	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function Process($oAccount, $sQuery, $iLimit = 20)
	{
		$aResult = array();

		try
		{
			if (!$oAccount || !\RainLoop\Utils::IsOwnCloud() ||
				!\class_exists('\\OCP\\Contacts') || !\OCP\Contacts::isEnabled())
			{
				return $aResult;
			}

			$aSearchResult = \OCP\Contacts::search($sQuery, array('FN', 'EMAIL'));

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
						$sEmail = \trim($sEmail);
						if (!empty($sEmail))
						{
							$iLimit--;
							$aResult[$sUid] = array($sEmail, $sFullName);
						}
					}
				}
			}

			unset($aSearchResult);

			$aResult = \array_values($aResult);
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
