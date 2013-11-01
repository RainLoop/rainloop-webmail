<?php

namespace RainLoop\Providers;

class Storage extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Storage\StorageInterface
	 */
	private $oDriver;

	/**
	 * @return void
	 */
	public function __construct(\RainLoop\Providers\Storage\StorageInterface $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $iStorageType
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Put($oAccount, $iStorageType, $sKey, $sValue)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return false;
		}

		return $this->oDriver->Put($oAccount, $iStorageType, $sKey, $sValue);
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param resource $rSource
	 *
	 * @return bool
	 */
	public function PutFile($oAccount, $iStorageType, $sKey, $rSource)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return false;
		}

		return $this->oDriver->PutFile($oAccount, $iStorageType, $sKey, $rSource);
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sSource
	 *
	 * @return bool
	 */
	public function MoveUploadedFile($oAccount, $iStorageType, $sKey, $sSource)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return false;
		}

		return $this->oDriver->MoveUploadedFile($oAccount, $iStorageType, $sKey, $sSource);
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($oAccount, $iStorageType, $sKey, $mDefault = false)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return $mDefault;
		}

		return $this->oDriver->Get($oAccount, $iStorageType, $sKey, $mDefault);
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sOpenMode = 'rb'
	 *
	 * @return resource | bool
	 */
	public function GetFile($oAccount, $iStorageType, $sKey, $sOpenMode = 'rb')
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return false;
		}

		return $this->oDriver->GetFile($oAccount, $iStorageType, $sKey, $sOpenMode);
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return string | bool
	 */
	public function GetFileName($oAccount, $iStorageType, $sKey)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return false;
		}

		return $this->oDriver->GetFileName($oAccount, $iStorageType, $sKey);
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function Clear($oAccount, $iStorageType, $sKey)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return false;
		}
		
		return $this->oDriver->Clear($oAccount, $iStorageType, $sKey);
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return int | bool
	 */
	public function FileSize($oAccount, $iStorageType, $sKey)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return false;
		}

		return $this->oDriver->FileSize($oAccount, $iStorageType, $sKey);
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function FileExists($oAccount, $iStorageType, $sKey)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType && !($oAccount instanceof \RainLoop\Account))
		{
			return false;
		}
		
		return $this->oDriver->FileExists($oAccount, $iStorageType, $sKey);
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
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Storage\StorageInterface;
	}
}
