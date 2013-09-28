<?php

namespace RainLoop\Providers\Storage;

interface StorageInterface
{
	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Put($oAccount, $iStorageType, $sKey, $sValue);

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param resource $rSource
	 *
	 * @return bool
	 */
	public function PutFile($oAccount, $iStorageType, $sKey, $rSource);

	/**
	 * @param CAccount $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sSource
	 *
	 * @return bool
	 */
	public function MoveUploadedFile($oAccount, $iStorageType, $sKey, $sSource);

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sSource
	 * @param string $sDest
	 *
	 * @return bool
	 */
	public function SaveFileToBase64File($oAccount, $iStorageType, $sSource, $sDest);

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($oAccount, $iStorageType, $sKey, $mDefault = false);

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sOpenMode = 'rb'
	 *
	 * @return resource | bool
	 */
	public function GetFile($oAccount, $iStorageType, $sKey, $sOpenMode = 'rb');

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return string | bool
	 */
	public function GetFileName($oAccount, $iStorageType, $sKey);

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function Clear($oAccount, $iStorageType, $sKey);

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return int | bool
	 */
	public function FileSize($oAccount, $iStorageType, $sKey);

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iType
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function FileExists($oAccount, $iStorageType, $sKey);

	/**
	 * @param int $iTimeToClearInHours = 24

	 * @return bool
	 */
	public function GC($iTimeToClearInHours = 24);
}
