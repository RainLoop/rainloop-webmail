<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;

trait Filters
{
	private ?\RainLoop\Providers\Filters $oFiltersProvider = null;

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFilters() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(Capa::SIEVE, $oAccount)) {
			return $this->FalseResponse();
		}

		return $this->DefaultResponse($this->FiltersProvider()->Load($oAccount));
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFiltersScriptSave() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(Capa::SIEVE, $oAccount)) {
			return $this->FalseResponse();
		}

		$sName = $this->GetActionParam('name', '');

		if ($this->GetActionParam('active', false)) {
//			$this->FiltersProvider()->ActivateScript($oAccount, $sName);
		}

		return $this->DefaultResponse($this->FiltersProvider()->Save(
			$oAccount, $sName, $this->GetActionParam('body', '')
		));
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFiltersScriptActivate() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(Capa::SIEVE, $oAccount)) {
			return $this->FalseResponse();
		}

		return $this->DefaultResponse($this->FiltersProvider()->ActivateScript(
			$oAccount, $this->GetActionParam('name', '')
		));
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFiltersScriptDelete() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(Capa::SIEVE, $oAccount)) {
			return $this->FalseResponse();
		}

		return $this->DefaultResponse($this->FiltersProvider()->DeleteScript(
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
