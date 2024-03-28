<?php

namespace RainLoop\Providers\Storage;

interface IStorage
{
	/**
	 * @param \RainLoop\Model\Account|null $mAccount
	 */
	public function Put($mAccount, int $iStorageType, string $sKey, string $sValue) : bool;

	/**
	 * @param \RainLoop\Model\Account|null $mAccount
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($mAccount, int $iStorageType, string $sKey, $mDefault = false);

	/**
	 * @param \RainLoop\Model\Account|null $mAccount
	 */
	public function Clear($mAccount, int $iStorageType, string $sKey) : bool;

	public function IsLocal() : bool;
}
