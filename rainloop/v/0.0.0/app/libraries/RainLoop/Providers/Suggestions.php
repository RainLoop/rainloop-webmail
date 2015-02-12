<?php

namespace RainLoop\Providers;

class Suggestions extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Suggestions\ISuggestions
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Providers\Suggestions\ISuggestions|null $oDriver = null
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
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function Process(\RainLoop\Account $oAccount, $sQuery, $iLimit = 20)
	{
		return $this->oDriver && $this->IsActive() && 0 < \strlen($sQuery) ?
			$this->oDriver->Process($oAccount, $sQuery, $iLimit = 20) : array();
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Suggestions\ISuggestions;
	}
}