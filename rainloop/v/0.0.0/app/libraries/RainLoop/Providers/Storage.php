<?php

namespace RainLoop\Providers;

class Storage extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Storage\IStorage
	 */
	private $oDriver;

	/**
	 * @return void
	 */
	public function __construct(\RainLoop\Providers\Storage\IStorage $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 * @param int $iStorageType
	 *
	 * @return bool
	 */
	private function verifyAccount($mAccount, $iStorageType)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType &&
			!($mAccount instanceof \RainLoop\Model\Account || \is_string($mAccount)))
		{
			return false;
		}

		return true;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Put($oAccount, $iStorageType, $sKey, $sValue)
	{
		if (!$this->verifyAccount($oAccount, $iStorageType))
		{
			return false;
		}

		return $this->oDriver->Put($oAccount, $iStorageType, $sKey, $sValue);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($oAccount, $iStorageType, $sKey, $mDefault = false)
	{
		if (!$this->verifyAccount($oAccount, $iStorageType))
		{
			return $mDefault;
		}

		return $this->oDriver->Get($oAccount, $iStorageType, $sKey, $mDefault);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function Clear($oAccount, $iStorageType, $sKey)
	{
		if (!$this->verifyAccount($oAccount, $iStorageType))
		{
			return false;
		}

		return $this->oDriver->Clear($oAccount, $iStorageType, $sKey);
	}

	/**
	 * @param \RainLoop\Model\Account|string $oAccount
	 *
	 * @return bool
	 */
	public function DeleteStorage($oAccount)
	{
		return $this->oDriver->DeleteStorage($oAccount);
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Storage\IStorage;
	}

	/**
	 * @return bool
	 */
	public function IsLocal()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Storage\IStorage &&
			$this->oDriver->IsLocal();
	}
}
