<?php

namespace RainLoop\Providers\Files;

interface IFiles
{
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function GenerateLocalFullFileName($oAccount, string $sKey) : string;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param resource $rSource
	 *
	 */
	public function PutFile($oAccount, string $sKey, $rSource) : bool;

	/**
	 * @param CAccount $oAccount
	 *
	 */
	public function MoveUploadedFile($oAccount, string $sKey, string $sSource) : bool;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return resource|bool
	 */
	public function GetFile($oAccount, string $sKey, string $sOpenMode = 'rb');

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function GetFileName($oAccount, string $sKey) : string;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function Clear($oAccount, string $sKey) : bool;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function FileSize($oAccount, string $sKey) : int;

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function FileExists($oAccount, string $sKey) : bool;

	public function GC(int $iTimeToClearInHours = 24) : bool;
}
