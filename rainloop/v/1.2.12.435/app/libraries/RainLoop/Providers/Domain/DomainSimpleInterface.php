<?php

namespace RainLoop\Providers\Domain;

interface DomainSimpleInterface extends DomainInterface
{
	/**
	 * @param string $sName
	 *
	 * @return \RainLoop\Domain | null
	 */
	public function Load($sName);
}