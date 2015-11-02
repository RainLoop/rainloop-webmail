<?php

namespace RainLoop\Providers\Storage;

interface IStorage
{
	/**
	 * @param \RainLoop\Model\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Put($oAccount, $iStorageType, $sKey, $sValue);

	/**
	 * @param \RainLoop\Model\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($oAccount, $iStorageType, $sKey, $mDefault = false);

	/**
	 * @param \RainLoop\Model\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function Clear($oAccount, $iStorageType, $sKey);

	/**
	 * @return bool
	 */
	public function IsLocal();
}
