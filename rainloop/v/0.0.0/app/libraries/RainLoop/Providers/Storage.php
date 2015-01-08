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
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 * @param int $iStorageType
	 *
	 * @return bool
	 */
	public function verifyAccount($oAccount, $iStorageType)
	{
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY !== $iStorageType &&
			!($oAccount instanceof \RainLoop\Model\Account || \is_string($oAccount)))
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
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Storage\StorageInterface;
	}
}
