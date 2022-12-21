<?php

namespace RainLoop\Providers;

class Suggestions extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Suggestions\ISuggestions[]
	 */
	private ?array $aDrivers;

	/**
	 * @param \RainLoop\Providers\Suggestions\ISuggestions[]|null $aDriver = null
	 */
	public function __construct(?array $aDriver = null)
	{
		if (\is_array($aDriver)) {
			$aDriver = \array_filter($aDriver, function ($oDriver) {
				return $oDriver instanceof \RainLoop\Providers\Suggestions\ISuggestions;
			});
		}

		$this->aDrivers = \is_array($aDriver) && \count($aDriver) ? $aDriver : null;
	}

	public function Process(\RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20) : array
	{
		$aResult = array();
		if (\strlen($sQuery) && $this->IsActive()) {
			foreach ($this->aDrivers as $oDriver) {
				if ($oDriver) try {
					$aSubs = $oDriver->Process($oAccount, $sQuery, $iLimit);
					if ($aSubs) {
						foreach ($aSubs as $aItem) {
							// Unique email address
							$sLine = \mb_strtolower($aItem[0]);
							if (!isset($aResult[$sLine])) {
								$aResult[$sLine] = $aItem;
							}
						}
						if ($iLimit < \count($aResult)) {
							break;
						}
					}
				} catch (\Throwable $oException) {
					$this->oLogger && $this->oLogger->WriteException($oException);
				}
			}
		}

		return \array_slice($aResult, 0, $iLimit);
	}

	public function IsActive() : bool
	{
		return \is_array($this->aDrivers) && \count($this->aDrivers);
	}
}
