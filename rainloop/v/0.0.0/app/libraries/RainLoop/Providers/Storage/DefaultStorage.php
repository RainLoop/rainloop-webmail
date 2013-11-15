<?php

namespace RainLoop\Providers\Storage;

class DefaultStorage implements \RainLoop\Providers\Storage\StorageInterface
{
	/**
	 * @var string
	 */
	private $sDataPath;

	/**
	 * @param string $sStoragePath
	 *
	 * @return void
	 */
	public function __construct($sStoragePath)
	{
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Put($oAccount, $iStorageType, $sKey, $sValue)
	{
		return false !== @\file_put_contents(
			$this->generateFileName($oAccount, $iStorageType, $sKey, true), $sValue);
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
		$mValue = false;
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey);
		if (\file_exists($sFileName))
		{
			$mValue = \file_get_contents($sFileName);
		}
		
		return false === $mValue ? $mDefault : $mValue;
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
		$mResult = true;
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = @\unlink($sFileName);
		}
		
		return $mResult;
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param bool $bMkDir = false
	 *
	 * @return string
	 */
	private function generateFileName($oAccount, $iStorageType, $sKey, $bMkDir = false)
	{
		if (!$oAccount)
		{
			$iStorageType = \RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY;
		}

		$sEmail = $oAccount ? \preg_replace('/[^a-z0-9\-\.@]+/', '_', 
			('' === $oAccount->ParentEmail() ? '' : $oAccount->ParentEmail().'/').$oAccount->Email()) : '';

		$sTypePath = $sKeyPath = '';
		switch ($iStorageType)
		{
			default:
			case \RainLoop\Providers\Storage\Enumerations\StorageType::USER:
			case \RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY:
				$sTypePath = 'data';
				$sKeyPath = \md5($sKey);
				$sKeyPath = \substr($sKeyPath, 0, 2).'/'.$sKeyPath;
				break;
			case \RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG:
				$sTypePath = 'cfg';
				$sKeyPath = \preg_replace('/[_]+/', '_', \preg_replace('/[^a-zA-Z0-9\/]/', '_', $sKey));
				break;
		}

		$sFilePath = '';
		if (\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY === $iStorageType)
		{
			$sFilePath = $this->sDataPath.'/'.$sTypePath.'/__nobody__/'.$sKeyPath;
		}
		else if (!empty($sEmail))
		{
			$sFilePath = $this->sDataPath.'/'.$sTypePath.'/'.rtrim(substr($sEmail, 0, 2), '@').'/'.$sEmail.'/'.$sKeyPath;
		}

		if ($bMkDir && !empty($sFilePath) && !@\is_dir(\dirname($sFilePath)))
		{
			if (!@\mkdir(\dirname($sFilePath), 0755, true))
			{
				throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sFilePath.'"');
			}
		}

		return $sFilePath;
	}
}
