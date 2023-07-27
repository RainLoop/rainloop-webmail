<?php

namespace RainLoop\Providers\Storage;

use RainLoop\Providers\Storage\Enumerations\StorageType;

class FileStorage implements \RainLoop\Providers\Storage\IStorage
{
	use \MailSo\Log\Inherit;

	/**
	 * @var string
	 */
	protected $sDataPath;

	/**
	 * @var bool
	 */
	private $bLocal;

	public function __construct(string $sStoragePath, bool $bLocal = false)
	{
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
		$this->bLocal = $bLocal;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function Put($mAccount, int $iStorageType, string $sKey, string $sValue) : bool
	{
		$sFileName = $this->generateFileName($mAccount, $iStorageType, $sKey, true);
		try {
			$sFileName && \RainLoop\Utils::saveFile($sFileName, $sValue);
			return true;
		} catch (\Throwable $e) {
			\SnappyMail\Log::warning('FileStorage', $e->getMessage());
		}
		return false;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($mAccount, int $iStorageType, string $sKey, $mDefault = false)
	{
		$mValue = false;
		$sFileName = $this->generateFileName($mAccount, $iStorageType, $sKey);
		if ($sFileName && \file_exists($sFileName)) {
			$mValue = \file_get_contents($sFileName);
			// Update mtime to prevent garbage collection
			if (StorageType::SESSION === $iStorageType) {
				\touch($sFileName);
			}
		}
		return false === $mValue ? $mDefault : $mValue;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function Clear($mAccount, int $iStorageType, string $sKey) : bool
	{
		$sFileName = $this->generateFileName($mAccount, $iStorageType, $sKey);
		return $sFileName && \file_exists($sFileName) && \unlink($sFileName);
	}

	/**
	 * @param \RainLoop\Model\Account|string $mAccount
	 */
	public function DeleteStorage($mAccount) : bool
	{
		$sPath = $this->generateFileName($mAccount, StorageType::CONFIG, '');
		if ($sPath && \is_dir($sPath)) {
			\MailSo\Base\Utils::RecRmDir($sPath);
		}
		return true;
	}

	public function IsLocal() : bool
	{
		return $this->bLocal;
	}

	public function GenerateFilePath($mAccount, int $iStorageType, bool $bMkDir = false) : string
	{
		$sEmail = $sSubFolder = '';
		if (null === $mAccount) {
			$iStorageType = StorageType::NOBODY;
		} else if ($mAccount instanceof \RainLoop\Model\MainAccount) {
			$sEmail = $mAccount->Email();
		} else if ($mAccount instanceof \RainLoop\Model\AdditionalAccount) {
			$sEmail = $mAccount->ParentEmail();
			if ($this->bLocal) {
				$sSubFolder = $mAccount->Email();
			}
		} else if (\is_string($mAccount)) {
			$sEmail = $mAccount;
		}

		if ($sEmail) {
			if (StorageType::SIGN_ME === $iStorageType) {
				$sSubFolder = '.sign_me';
			} else if (StorageType::SESSION === $iStorageType) {
				$sSubFolder = '.sessions';
			} else if (StorageType::PGP === $iStorageType) {
				$sSubFolder = '.pgp';
			} else if (StorageType::ROOT === $iStorageType) {
				$sSubFolder = '';
			}
		}

		$sFilePath = '';
		switch ($iStorageType)
		{
			case StorageType::NOBODY:
				$sFilePath = $this->sDataPath.'/__nobody__/';
				break;
			case StorageType::SIGN_ME:
			case StorageType::SESSION:
			case StorageType::CONFIG:
			case StorageType::PGP:
			case StorageType::ROOT:
				if (empty($sEmail)) {
					return '';
				}
				if (\is_dir("{$this->sDataPath}/cfg")) {
					\SnappyMail\Upgrade::FileStorage($this->sDataPath);
				}
				$aEmail = \explode('@', $sEmail ?: 'nobody@unknown.tld');
				$sDomain = \trim(1 < \count($aEmail) ? \array_pop($aEmail) : '');
				$sFilePath = $this->sDataPath
					.'/'.\MailSo\Base\Utils::SecureFileName($sDomain ?: 'unknown.tld')
					.'/'.\MailSo\Base\Utils::SecureFileName(\implode('@', $aEmail) ?: '.unknown')
					.'/'.($sSubFolder ? \MailSo\Base\Utils::SecureFileName($sSubFolder).'/' : '');
				break;
			default:
				throw new \Exception("Invalid storage type {$iStorageType}");
		}

		if ($bMkDir && !empty($sFilePath) && !\is_dir($sFilePath) && !\mkdir($sFilePath, 0700, true))
		{
			throw new \RuntimeException('Can\'t make storage directory "'.$sFilePath.'"');
		}

		return $sFilePath;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	protected function generateFileName($mAccount, int $iStorageType, string $sKey, bool $bMkDir = false) : string
	{
		$sFilePath = $this->GenerateFilePath($mAccount, $iStorageType, $bMkDir);
		if ($sFilePath) {
			if (StorageType::NOBODY === $iStorageType) {
				$sFilePath .= \sha1($sKey ?: \time());
			} else {
				$sFilePath .= ($sKey ? \MailSo\Base\Utils::SecureFileName($sKey) : '');
			}
		}
		return $sFilePath;
	}

	public function GC() : void
	{
		\clearstatcache();
		foreach (\glob("{$this->sDataPath}/*", GLOB_ONLYDIR) as $sDomain) {
			foreach (\glob("{$sDomain}/*", GLOB_ONLYDIR) as $sLocal) {
				\MailSo\Base\Utils::RecTimeDirRemove("{$sLocal}/.sign_me", 3600 * 24 * 30); // 30 days
				\MailSo\Base\Utils::RecTimeDirRemove("{$sLocal}/.sessions", 3600 * 3); // 3 hours
			}
		}
	}
}
