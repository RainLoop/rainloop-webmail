<?php

namespace RainLoop\Providers\Files;

interface IFiles
{
	public function GenerateLocalFullFileName(\RainLoop\Model\Account $oAccount, string $sKey) : string;

	public function PutFile(\RainLoop\Model\Account $oAccount, string $sKey, /*resource*/ $rSource) : bool;

	public function MoveUploadedFile(\RainLoop\Model\Account $oAccount, string $sKey, string $sSource) : bool;

	/**
	 * @return resource|bool
	 */
	public function GetFile(\RainLoop\Model\Account $oAccount, string $sKey, string $sOpenMode = 'rb');

	/**
	 * @return string|bool
	 */
	public function GetFileName(\RainLoop\Model\Account $oAccount, string $sKey);

	public function Clear(\RainLoop\Model\Account $oAccount, string $sKey) : bool;

	/**
	 * @return int | bool
	 */
	public function FileSize(\RainLoop\Model\Account $oAccount, string $sKey);

	public function FileExists(\RainLoop\Model\Account $oAccount, string $sKey) : bool;

	public function GC(int $iTimeToClearInHours = 24) : bool;
}
