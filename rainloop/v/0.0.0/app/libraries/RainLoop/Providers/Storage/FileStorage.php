<?php

namespace RainLoop\Providers\Storage;

class FileStorage implements \RainLoop\Providers\Storage\IStorage
{
	/**
	 * @var string
	 */
	private $sDataPath;

	/**
	 * @var bool
	 */
	private $bLocal;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger;

	/**
	 * @param string $sStoragePath
	 * @param bool $bLocal = false
	 *
	 * @return void
	 */
	public function __construct($sStoragePath, $bLocal = false)
	{
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
		$this->bLocal = !!$bLocal;
		$this->oLogger = null;
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
		return false !== @\file_put_contents(
			$this->generateFileName($oAccount, $iStorageType, $sKey, true), $sValue);
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
		$mValue = false;
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey);
		if (\file_exists($sFileName))
		{
			$mValue = \file_get_contents($sFileName);
		}

		return false === $mValue ? $mDefault : $mValue;
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
		$mResult = true;
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = @\unlink($sFileName);
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Model\Account|string $oAccount
	 *
	 * @return bool
	 */
	public function DeleteStorage($oAccount)
	{
		$sPath = $this->generateFileName($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::USER, 'xxx', false, true);

		if (!empty($sPath) && \is_dir($sPath))
		{
			\MailSo\Base\Utils::RecRmDir($sPath);
		}

		$sPath = $this->generateFileName($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG, 'xxx', false, true);

		if (!empty($sPath) && \is_dir($sPath))
		{
			\MailSo\Base\Utils::RecRmDir($sPath);
		}

		return true;
	}

	/**
	 * @return bool
	 */
	public function IsLocal()
	{
		return $this->bLocal;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param bool $bMkDir = false
	 * @param bool $bForDeleteAction = false
	 *
	 * @return string
	 */
	public function generateFileName($mAccount, $iStorageType, $sKey, $bMkDir = false, $bForDeleteAction = false)
	{
		if (null === $mAccount)
		{
			$iStorageType = \RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY;
		}

		$sEmail = $sSubEmail = '';
		if ($mAccount instanceof \RainLoop\Model\Account)
		{
			$sEmail = $mAccount->ParentEmailHelper();
			if ($this->bLocal && $mAccount->IsAdditionalAccount() && !$bForDeleteAction)
			{
				$sSubEmail = $mAccount->Email();
			}
		}

		if (\is_string($mAccount) && empty($sEmail))
		{
			$sEmail = $mAccount;
		}

		$sEmail = \preg_replace('/[^a-z0-9\-\.@]+/', '_', $sEmail);
		$sSubEmail = \preg_replace('/[^a-z0-9\-\.@]+/', '_', $sSubEmail);

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
			$sFilePath = $this->sDataPath.'/'.$sTypePath.'/'.
				\str_pad(\rtrim(\substr($sEmail, 0, 2), '@'), 2, '_').'/'.$sEmail.'/'.
				(0 < \strlen($sSubEmail) ? $sSubEmail.'/' : '').
				($bForDeleteAction ? '' : $sKeyPath);
		}

		if ($bMkDir && !$bForDeleteAction && !empty($sFilePath) && !@\is_dir(\dirname($sFilePath)))
		{
			if (!@\mkdir(\dirname($sFilePath), 0755, true))
			{
				throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sFilePath.'"');
			}
		}

		return $sFilePath;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 */
	public function SetLogger($oLogger)
	{
		$this->oLogger = $oLogger instanceof \MailSo\Log\Logger ? $oLogger : null;
	}
}
