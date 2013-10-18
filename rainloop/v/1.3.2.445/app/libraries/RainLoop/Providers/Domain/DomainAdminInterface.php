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
	 *
	 * @return \RainLoop\Domain | null
	 */
	public function Load($sName);

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
	 * @param string $sSearch = ''
	 *
	 * @return array
	 */
	public function GetList($iOffset, $iLimit = 20, $sSearch = '');

	/**
	 * @param string $sSearch = ''
	 *
	 * @return int
	 */
	public function Count($sSearch = '');
}