<?php

namespace RainLoop\Providers;

class Suggestions extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Suggestions\SuggestionsInterface
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Providers\Suggestions\SuggestionsInterface|null $oDriver = null
	 *
	 * @return void
	 */
	public function __construct($oDriver = null)
	{
		$this->oDriver = $oDriver;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sQuery
	 *
	 * @return array
	 */
	public function Process(\RainLoop\Account $oAccount, $sQuery)
	{
		return $this->oDriver && $this->IsActive() && 0 < \strlen($sQuery) ? $this->oDriver->Process($oAccount, $sQuery) : array();
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Suggestions\SuggestionsInterface;
	}
}