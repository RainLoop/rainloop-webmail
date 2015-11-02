<?php

namespace RainLoop\Providers;

class Files extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Files\IFiles
	 */
	private $oDriver;

	/**
	 * @return void
	 */
	public function __construct(\RainLoop\Providers\Files\IFiles $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 * @param resource $rSource
	 *
	 * @return bool
	 */
	public function PutFile($oAccount, $sKey, $rSource)
	{
		return $this->oDriver->PutFile($oAccount, $sKey, $rSource);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 * @param string $sSource
	 *
	 * @return bool
	 */
	public function MoveUploadedFile($oAccount, $sKey, $sSource)
	{
		return $this->oDriver->MoveUploadedFile($oAccount, $sKey, $sSource);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 * @param string $sOpenMode = 'rb'
	 *
	 * @return resource|bool
	 */
	public function GetFile($oAccount, $sKey, $sOpenMode = 'rb')
	{
		return $this->oDriver->GetFile($oAccount, $sKey, $sOpenMode);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return string | bool
	 */
	public function GetFileName($oAccount, $sKey)
	{
		return $this->oDriver->GetFileName($oAccount, $sKey);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function Clear($oAccount, $sKey)
	{
		return $this->oDriver->Clear($oAccount, $sKey);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return int|bool
	 */
	public function FileSize($oAccount, $sKey)
	{
		return $this->oDriver->FileSize($oAccount, $sKey);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function FileExists($oAccount, $sKey)
	{
		return $this->oDriver->FileExists($oAccount, $sKey);
	}

	/**
	 * @param int $iTimeToClearInHours = 24
	 *
	 * @return bool
	 */
	public function GC($iTimeToClearInHours = 24)
	{
		return $this->oDriver ? $this->oDriver->GC($iTimeToClearInHours) : false;
	}

	/**
	 * @return bool
	 */
	public function CloseAllOpenedFiles()
	{
		return $this->oDriver && \method_exists($this->oDriver, 'CloseAllOpenedFiles') ?
			$this->oDriver->CloseAllOpenedFiles() : false;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return string
	 */
	public function GenerateLocalFullFileName($oAccount, $sKey)
	{
		return $this->oDriver ? $this->oDriver->GenerateLocalFullFileName($oAccount, $sKey) : '';
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Files\IFiles;
	}
}
