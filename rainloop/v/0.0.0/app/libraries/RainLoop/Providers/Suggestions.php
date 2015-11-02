<?php

namespace RainLoop\Providers;

class Suggestions extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Suggestions\ISuggestions[]
	 */
	private $aDrivers;

	/**
	 * @param \RainLoop\Providers\Suggestions\ISuggestions[]|null $aDriver = null
	 *
	 * @return void
	 */
	public function __construct($aDriver = null)
	{
		if (\is_array($aDriver))
		{
			$aDriver = \array_filter($aDriver, function ($oDriver) {
				return $oDriver instanceof \RainLoop\Providers\Suggestions\ISuggestions;
			});
		}

		$this->aDrivers = \is_array($aDriver) && 0 < \count($aDriver) ? $aDriver : null;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function Process($oAccount, $sQuery, $iLimit = 20)
	{
		$aSuggestions = array();
		if ($oAccount instanceof \RainLoop\Model\Account &&
			$this->IsActive() && \is_array($this->aDrivers) && 0 < \strlen($sQuery))
		{
			foreach ($this->aDrivers as $oDriver)
			{
				$aSubs = null;
				if ($oDriver)
				{
					$aSubs = $oDriver->Process($oAccount, $sQuery, $iLimit);
					if (\is_array($aSubs) && 0 < \count($aSubs))
					{
						$aSuggestions = \array_merge($aSuggestions, $aSubs);
					}
				}
			}
		}

		$aResult = \RainLoop\Utils::RemoveSuggestionDuplicates($aSuggestions);

		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		return $aResult;
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return \is_array($this->aDrivers) && 0 < \count($this->aDrivers);
	}
}