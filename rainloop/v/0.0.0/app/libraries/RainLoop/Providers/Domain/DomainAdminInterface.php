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
	 * @return \RainLoop\Model\Domain|null
	 */
	public function Load($sName, $bFindWithWildCard = false, $bCheckDisabled = true);

	/**
	 * @param \RainLoop\Model\Domain $oDomain
	 *
	 * @return bool
	 */
	public function Save(\RainLoop\Model\Domain $oDomain);

	/**
	 * @param string $sName
	 *
	 * @return bool
	 */
	public function Delete($sName);

	/**
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param int $sSearch = ''
	 * @param bool $bIncludeAliases = true
	 *
	 * @return array
	 */
	public function GetList($iOffset = 0, $iLimit = 20, $sSearch = '', $bIncludeAliases = true);

	/**
	 * @param string $sSearch = ''
	 * @param bool $bIncludeAliases = true
	 *
	 * @return int
	 */
	public function Count($sSearch = '', $bIncludeAliases = true);
}