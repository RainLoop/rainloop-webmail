<?php

namespace RainLoop\Providers\Storage;

class TemproryApcStorage extends \RainLoop\Providers\Storage\FileStorage
{
	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 */
	public function Put($oAccount, int $iStorageType, string $sKey, string $sValue) : bool
	{
		return !!\apcu_store($this->generateFileName($oAccount, $iStorageType, $sKey, true), $sValue);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($oAccount, int $iStorageType, string $sKey, $mDefault = false)
	{
		$bValue = false;
		$mValue = \apcu_fetch($this->generateFileName($oAccount, $iStorageType, $sKey), $bValue);
		if (!$bValue)
		{
			$mValue = $mDefault;
		}

		return $mValue;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 */
	public function Clear($oAccount, int $iStorageType, string $sKey) : bool
	{
		\apcu_delete($this->generateFileName($oAccount, $iStorageType, $sKey));

		return true;
	}

	/**
	 * @param \RainLoop\Model\Account|string $oAccount
	 */
	public function DeleteStorage($oAccount) : bool
	{
		return !!$oAccount;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function generateFileName($mAccount, int $iStorageType, string $sKey, bool $bMkDir = false, bool $bForDeleteAction = false) : string
	{
		$sFileName = parent::generateFileName($mAccount, $iStorageType, $sKey, false, false);
		return $sFileName.'/'.\RainLoop\Utils::GetConnectionToken().'/';
	}
}
