<?php

namespace RainLoop\Providers\Domain;

interface DomainAdminInterface extends DomainInterface
{

	/**
	 * @param string $sName
	 * @param bool $bDisable
	 *
	 * @return bool
	 */
	public function Disable($sName, $bDisable);

	/**
	 * @param string $sName
	 * @param bool $bFindWithWildCard = false
	 * @param bool $bCheckDisabled = true
	 *
	 * @return \RainLoop\Domain|null
	 */
	public function Load($sName, $bFindWithWildCard = false, $bCheckDisabled = true);

	/**
	 * @param \RainLoop\Domain $oDomain
	 *
	 * @return bool
	 */
	public function Save(\RainLoop\Domain $oDomain);

	/**
	 * @param string $sName
	 *
	 * @return bool
	 */
	public function Delete($sName);

	/**
	 * @param int $iOffset
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function GetList($iOffset, $iLimit = 20);

	/**
	 * @return int
	 */
	public function Count();
}