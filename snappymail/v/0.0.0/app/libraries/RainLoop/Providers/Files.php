<?php

namespace RainLoop\Providers;

class Files extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Files\IFiles
	 */
	private $oDriver;

	public function __construct(\RainLoop\Providers\Files\IFiles $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	public function PutFile(\RainLoop\Model\Account $oAccount, string $sKey, /*resource*/ $rSource) : bool
	{
		return $this->oDriver->PutFile($oAccount, $sKey, $rSource);
	}

	public function MoveUploadedFile(\RainLoop\Model\Account $oAccount, string $sKey, string $sSource) : bool
	{
		return $this->oDriver->MoveUploadedFile($oAccount, $sKey, $sSource);
	}

	/**
	 * @return resource|bool
	 */
	public function GetFile(\RainLoop\Model\Account $oAccount, string $sKey, string $sOpenMode = 'rb')
	{
		return $this->oDriver->GetFile($oAccount, $sKey, $sOpenMode);
	}

	public function GetFileName(\RainLoop\Model\Account $oAccount, string $sKey) : string
	{
		return $this->oDriver->GetFileName($oAccount, $sKey);
	}

	public function Clear(\RainLoop\Model\Account $oAccount, string $sKey) : bool
	{
		return $this->oDriver->Clear($oAccount, $sKey);
	}

	public function FileSize(\RainLoop\Model\Account $oAccount, string $sKey) : int
	{
		return $this->oDriver->FileSize($oAccount, $sKey);
	}

	public function FileExists(\RainLoop\Model\Account $oAccount, string $sKey) : bool
	{
		return $this->oDriver->FileExists($oAccount, $sKey);
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		return $this->oDriver ? $this->oDriver->GC($iTimeToClearInHours) : false;
	}

	public function CloseAllOpenedFiles() : bool
	{
		return $this->oDriver && \method_exists($this->oDriver, 'CloseAllOpenedFiles') ?
			$this->oDriver->CloseAllOpenedFiles() : false;
	}

	public function GenerateLocalFullFileName(\RainLoop\Model\Account $oAccount, string $sKey) : string
	{
		return $this->oDriver ? $this->oDriver->GenerateLocalFullFileName($oAccount, $sKey) : '';
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\Files\IFiles;
	}
}
