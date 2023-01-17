<?php

namespace RainLoop\Providers;

class Suggestions extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Suggestions\ISuggestions[]
	 */
	private array $aDrivers = [];

	/**
	 * @param \RainLoop\Providers\Suggestions\ISuggestions[]|null $aDriver = null
	 */
	public function __construct(?array $aDriver = null)
	{
		if (\is_array($aDriver)) {
			$this->aDrivers = \array_filter($aDriver, function ($oDriver) {
				return $oDriver instanceof \RainLoop\Providers\Suggestions\ISuggestions;
			});
		}
	}

	public function Process(\RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20) : array
	{
		if (!\strlen($sQuery)) {
			return [];
		}

		$iLimit = \max(5, (int) $iLimit);
		$aResult = [];

		// Address Book
		try
		{
			$oAddressBookProvider = \RainLoop\Api::Actions()->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive()) {
				$aSuggestions = $oAddressBookProvider->GetSuggestions($sQuery, $iLimit);
				foreach ($aSuggestions as $aItem) {
					// Unique email address
					$sLine = \mb_strtolower($aItem[0]);
					if (!isset($aResult[$sLine])) {
						$aResult[$sLine] = $aItem;
					}
				}
			}
		}
		catch (\Throwable $oException)
		{
			$this->oLogger && $this->oLogger->WriteException($oException);
		}

		// Extensions/Plugins
		foreach ($this->aDrivers as $oDriver) {
			if ($oDriver) try {
				$aSuggestions = $oDriver->Process($oAccount, $sQuery, $iLimit);
				if ($aSuggestions) {
					foreach ($aSuggestions as $aItem) {
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

		return \array_slice(\array_values($aResult), 0, $iLimit);
	}

	public function IsActive() : bool
	{
		return \count($this->aDrivers);
	}
}
