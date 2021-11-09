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
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 * @param mixed $sValue
	 */
	public function Put($mAccount, int $iStorageType, string $sKey, string $sValue) : bool
	{
		if (!$this->verifyAccount($mAccount, $iStorageType))
		{
			return false;
		}

		return $this->oDriver->Put($mAccount, $iStorageType, $sKey, $sValue);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($mAccount, int $iStorageType, string $sKey, $mDefault = false)
	{
		if (!$this->verifyAccount($mAccount, $iStorageType))
		{
			return $mDefault;
		}

		return $this->oDriver->Get($mAccount, $iStorageType, $sKey, $mDefault);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function Clear($mAccount, int $iStorageType, string $sKey) : bool
	{
		if (!$this->verifyAccount($mAccount, $iStorageType))
		{
			return false;
		}

		return $this->oDriver->Clear($mAccount, $iStorageType, $sKey);
	}

	/**
	 * @param \RainLoop\Model\Account|string $mAccount
	 */
	public function DeleteStorage($mAccount) : bool
	{
		return $this->oDriver->DeleteStorage($mAccount);
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
