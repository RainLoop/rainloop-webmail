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
		$aResult = array();

		try
		{
			if (!$oAccount || !\RainLoop\Utils::IsOwnCloud() ||
				!\class_exists('\\OCP\\Contacts') || !\OCP\Contacts::isEnabled() ||
				!\class_exists('\\OCP\\User') || !\OCP\User::isLoggedIn()
			)
			{
				return $aResult;
			}

			$aSearchResult = \OCP\Contacts::search($sQuery, array('FN', 'EMAIL'));
			//$this->oLogger->WriteDump($aSearchResult);

			$aPreResult = array();
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

						if (!isset($aPreResult[$sUid]))
						{
							$aPreResult[$sUid] = array();
						}

						foreach ($mEmails as $sEmail)
						{
							$sEmail = \trim($sEmail);
							if (!empty($sEmail))
							{
								$iLimit--;
								$aPreResult[$sUid][] = array($sEmail, $sFullName);
							}
						}
					}
				}

				$aPreResult = \array_values($aPreResult);
//				$this->oLogger->WriteDump($aPreResult);
				foreach ($aPreResult as $aData)
				{
					foreach ($aData as $aSubData)
					{
						$aResult[] = $aSubData;
					}
				}
			}

			unset($aSearchResult, $aPreResult);
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
