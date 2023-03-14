<?php

namespace RainLoop\Providers\Settings;

class DefaultSettings implements ISettings
{
	const FILE_NAME = 'settings';
	const FILE_NAME_LOCAL = 'settings_local';

	/**
	 * @var \RainLoop\Providers\Storage
	 */
	private $oStorageProvider;

	public function __construct(\RainLoop\Providers\Storage $oStorageProvider)
	{
		$this->oStorageProvider = $oStorageProvider;
	}

	public function Load(\RainLoop\Model\Account $oAccount) : array
	{
		$sValue = $this->oStorageProvider->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
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

	public function Save(\RainLoop\Model\Account $oAccount, \RainLoop\Settings $oSettings) : bool
	{
		return $this->oStorageProvider->Put($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			$this->oStorageProvider->IsLocal() ?
				self::FILE_NAME_LOCAL :
				self::FILE_NAME,
			\json_encode($oSettings));
	}

	public function Delete(\RainLoop\Model\Account $oAccount) : bool
	{
		return $this->oStorageProvider->Clear($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			$this->oStorageProvider->IsLocal() ?
				self::FILE_NAME_LOCAL :
				self::FILE_NAME);
	}
}
