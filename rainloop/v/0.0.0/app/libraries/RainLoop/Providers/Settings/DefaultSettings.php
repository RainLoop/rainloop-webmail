<?php

namespace RainLoop\Providers\Settings;

class DefaultSettings implements \RainLoop\Providers\Settings\ISettings
{
	const FILE_NAME = 'settings';
	const FILE_NAME_LOCAL = 'settings_local';

	/**
	 * @var \RainLoop\Providers\Storage
	 */
	private $oStorageProvider;

	/**
	 * @param \RainLoop\Providers\Storage $oStorageProvider
	 */
	public function __construct(\RainLoop\Providers\Storage $oStorageProvider)
	{
		$this->oStorageProvider = $oStorageProvider;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return array
	 */
	public function Load($oAccount)
	{
		$sValue = $this->oStorageProvider->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			$this->oStorageProvider->IsLocal() ?
				\RainLoop\Providers\Settings\DefaultSettings::FILE_NAME_LOCAL :
				\RainLoop\Providers\Settings\DefaultSettings::FILE_NAME
		);

		$aSettings = array();
		if (\is_string($sValue))
		{
			$aData = \json_decode($sValue, true);
			if (\is_array($aData))
			{
				$aSettings = $aData;
			}
		}

		return $aSettings;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aSettings
	 *
	 * @return bool
	 */
	public function Save($oAccount, array $aSettings)
	{
		return $this->oStorageProvider->Put($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			$this->oStorageProvider->IsLocal() ?
				\RainLoop\Providers\Settings\DefaultSettings::FILE_NAME_LOCAL :
				\RainLoop\Providers\Settings\DefaultSettings::FILE_NAME,
			\json_encode($aSettings));
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return bool
	 */
	public function Delete($oAccount)
	{
		return $this->oStorageProvider->Clear($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			$this->oStorageProvider->IsLocal() ?
				\RainLoop\Providers\Settings\DefaultSettings::FILE_NAME_LOCAL :
				\RainLoop\Providers\Settings\DefaultSettings::FILE_NAME);
	}
}