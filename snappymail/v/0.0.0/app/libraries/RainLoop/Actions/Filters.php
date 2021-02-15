<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;

trait Filters
{
	/**
	 * @var \RainLoop\Providers\Filters
	 */
	private $oFiltersProvider;

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFilters() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::FILTERS, $oAccount))
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

		return $this->DefaultResponse(__FUNCTION__, $this->FiltersProvider()->Load($oAccount));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFiltersScriptSave() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::FILTERS, $oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sName = $this->GetActionParam('name', '');

		$aFilters = array();
		if (\RainLoop\Providers\Filters\SieveStorage::SIEVE_FILE_NAME === $sName) {
			$aIncFilters = $this->GetActionParam('filters', array());
			foreach ($aIncFilters as $aFilter) {
				if (\is_array($aFilter)) {
					$oFilter = new \RainLoop\Providers\Filters\Classes\Filter();
					if ($oFilter->FromJSON($aFilter)) {
						$aFilters[] = $oFilter;
					}
				}
			}
		}

		if ($this->GetActionParam('active', false)) {
//			$this->FiltersProvider()->ActivateScript($oAccount, $sName);
		}

		return $this->DefaultResponse(__FUNCTION__, $this->FiltersProvider()->Save(
			$oAccount, $sName, $aFilters, $this->GetActionParam('body', '')
		));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFiltersScriptActivate() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::FILTERS, $oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, $this->FiltersProvider()->ActivateScript(
			$oAccount, $this->GetActionParam('name', '')
		));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFiltersScriptDelete() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::FILTERS, $oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, $this->FiltersProvider()->DeleteScript(
			$oAccount, $this->GetActionParam('name', '')
		));
	}

	protected function FiltersProvider() : \RainLoop\Providers\Filters
	{
		if (!$this->oFiltersProvider) {
			$this->oFiltersProvider = new \RainLoop\Providers\Filters($this->fabrica('filters'));
		}
		return $this->oFiltersProvider;
	}
}
