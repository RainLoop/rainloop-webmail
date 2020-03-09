<?php

namespace RainLoop\Providers\Domain;

interface DomainAdminInterface extends DomainInterface
{

	public function Disable(string $sName, bool $bDisable) : bool;

	/**
	 * @return \RainLoop\Model\Domain|null
	 */
	public function Load(string $sName, bool $bFindWithWildCard = false, bool $bCheckDisabled = true);

	public function Save(\RainLoop\Model\Domain $oDomain) : bool;

	public function Delete(string $sName) : bool;

	public function GetList(int $iOffset = 0, int $iLimit = 20, string $sSearch = '', bool $bIncludeAliases = true) : array;

	public function Count(string $sSearch = '', bool $bIncludeAliases = true) : int;
}
