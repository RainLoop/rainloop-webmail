<?php

namespace RainLoop\Providers\Settings;

use RainLoop\Model\Account;
use RainLoop\Providers\Storage;
use RainLoop\Providers\Storage\Enumerations\StorageType;

class DefaultSettings implements ISettings
{
	const FILE_NAME = 'settings';
	const FILE_NAME_LOCAL = 'settings_local';

	private Storage $oStorageProvider;

	public function __construct(Storage $oStorageProvider)
	{
		$this->oStorageProvider = $oStorageProvider;
	}

	public function Load(Account $oAccount) : array
	{
		$sValue = $this->oStorageProvider->Get($oAccount,
			StorageType::CONFIG,
			$this->oStorageProvider->IsLocal() ?
				self::FILE_NAME_LOCAL :
				self::FILE_NAME
		);

		if (\is_string($sValue)) {
			$aData = \json_decode($sValue, true);
			if (\is_array($aData)) {
				return $aData;
			}
		}

		return array();
	}

	public function Save(Account $oAccount, \RainLoop\Settings $oSettings) : bool
	{
		return $this->oStorageProvider->Put($oAccount,
			StorageType::CONFIG,
			$this->oStorageProvider->IsLocal() ?
				self::FILE_NAME_LOCAL :
				self::FILE_NAME,
			\json_encode($oSettings));
	}

	public function Delete(Account $oAccount) : bool
	{
		return $this->oStorageProvider->Clear($oAccount,
			StorageType::CONFIG,
			$this->oStorageProvider->IsLocal() ?
				self::FILE_NAME_LOCAL :
				self::FILE_NAME);
	}
}
