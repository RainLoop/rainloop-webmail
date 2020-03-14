<?php

namespace RainLoop\Providers;

class Storage extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Storage\IStorage
	 */
	private $oDriver;

	public function __construct(\RainLoop\Providers\Storage\IStorage $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	private function verifyAccount($mAccount, int $iStorageType) : bool
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
	 * @param mixed $sValue
	 */
	public function Put($oAccount, int $iStorageType, string $sKey, $sValue) : bool
	{
		if (!$this->verifyAccount($oAccount, $iStorageType))
		{
			return false;
		}

		return $this->oDriver->Put($oAccount, $iStorageType, $sKey, $sValue);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($oAccount, int $iStorageType, string $sKey, $mDefault = false)
	{
		if (!$this->verifyAccount($oAccount, $iStorageType))
		{
			return $mDefault;
		}

		return $this->oDriver->Get($oAccount, $iStorageType, $sKey, $mDefault);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 */
	public function Clear($oAccount, int $iStorageType, string $sKey) : bool
	{
		if (!$this->verifyAccount($oAccount, $iStorageType))
		{
			return false;
		}

		return $this->oDriver->Clear($oAccount, $iStorageType, $sKey);
	}

	/**
	 * @param \RainLoop\Model\Account|string $oAccount
	 */
	public function DeleteStorage($oAccount) : bool
	{
		return $this->oDriver->DeleteStorage($oAccount);
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\Storage\IStorage;
	}

	public function IsLocal() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\Storage\IStorage &&
			$this->oDriver->IsLocal();
	}
}
