<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;

trait Filters
{
	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFilters() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::FILTERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$aFakeFilters = null;

		$this->Plugins()
			->RunHook('filter.filters-fake', array($oAccount, &$aFakeFilters))
		;

		if ($aFakeFilters)
		{
			return $this->DefaultResponse(__FUNCTION__, $aFakeFilters);
		}

		return $this->DefaultResponse(__FUNCTION__,
			$this->FiltersProvider()->Load($oAccount, $oAccount->DomainSieveAllowRaw()));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFiltersSave() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::FILTERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$aIncFilters = $this->GetActionParam('Filters', array());

		$sRaw = $this->GetActionParam('Raw', '');
		$bRawIsActive = '1' === (string) $this->GetActionParam('RawIsActive', '0');

		$aFilters = array();
		foreach ($aIncFilters as $aFilter)
		{
			if (is_array($aFilter))
			{
				$oFilter = new \RainLoop\Providers\Filters\Classes\Filter();
				if ($oFilter->FromJSON($aFilter))
				{
					$aFilters[] = $oFilter;
				}
			}
		}

		$this->Plugins()
			->RunHook('filter.filters-save', array($oAccount, &$aFilters, &$sRaw, &$bRawIsActive))
		;

		return $this->DefaultResponse(__FUNCTION__, $this->FiltersProvider()->Save($oAccount,
			$aFilters, $sRaw, $bRawIsActive));
	}

}
