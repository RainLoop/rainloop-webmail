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
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Storage\StorageInterface;
	}
}
