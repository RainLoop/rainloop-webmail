<?php

namespace RainLoop\Providers\Storage;

interface IStorage
{
	/**
	 * @param \RainLoop\Model\Account|null $oAccount
	 */
	public function Put($oAccount, int $iStorageType, string $sKey, string $sValue) : bool;

	/**
	 * @param \RainLoop\Model\Account|null $oAccount
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($oAccount, int $iStorageType, string $sKey, $mDefault = false);

	/**
	 * @param \RainLoop\Model\Account|null $oAccount
	 */
	public function Clear($oAccount, int $iStorageType, string $sKey) : bool;

	public function IsLocal() : bool;
}
