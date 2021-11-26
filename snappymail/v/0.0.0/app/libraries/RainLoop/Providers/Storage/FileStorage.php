<?php

namespace RainLoop\Providers\Storage;

use RainLoop\Providers\Storage\Enumerations\StorageType;

class FileStorage implements \RainLoop\Providers\Storage\IStorage
{
	/**
	 * @var string
	 */
	protected $sDataPath;

	/**
	 * @var bool
	 */
	private $bLocal;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger;

	public function __construct(string $sStoragePath, bool $bLocal = false)
	{
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
		$this->bLocal = !!$bLocal;
		$this->oLogger = null;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function Put($mAccount, int $iStorageType, string $sKey, string $sValue) : bool
	{
		$sFileName = $this->generateFileName($mAccount, $iStorageType, $sKey, true);
		return $sFileName && false !== \file_put_contents($sFileName, $sValue);
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
		}

		return false === $mValue ? $mDefault : $mValue;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function Clear($mAccount, int $iStorageType, string $sKey) : bool
	{
		$mResult = true;
		$sFileName = $this->generateFileName($mAccount, $iStorageType, $sKey);
		if ($sFileName && \file_exists($sFileName)) {
			$mResult = \unlink($sFileName);
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Model\Account|string $mAccount
	 */
	public function DeleteStorage($mAccount) : bool
	{
		$sPath = $this->generateFileName($mAccount, StorageType::CONFIG, '', false, true);
		if ($sPath && \is_dir($sPath)) {
			\MailSo\Base\Utils::RecRmDir($sPath);
		}
		return true;
	}

	public function IsLocal() : bool
	{
		return $this->bLocal;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	protected function generateFileName($mAccount, int $iStorageType, string $sKey, bool $bMkDir = false, bool $bForDeleteAction = false) : string
	{
		$sEmail = $sSubEmail = '';
		if (null === $mAccount) {
			$iStorageType = StorageType::NOBODY;
		} else if ($mAccount instanceof \RainLoop\Model\Account) {
			$sEmail = $mAccount instanceof \RainLoop\Model\AdditionalAccount ? $mAccount->ParentEmail() : $mAccount->Email();
			if ($this->bLocal && $mAccount instanceof \RainLoop\Model\AdditionalAccount && !$bForDeleteAction)
			{
				$sSubEmail = $mAccount->Email();
			}
		} else if (\is_string($mAccount) && empty($sEmail)) {
			$sEmail = $mAccount;
		}

		$sFilePath = '';
		switch ($iStorageType)
		{
			case StorageType::NOBODY:
				$sFilePath = $this->sDataPath.'/__nobody__/'.\sha1($sKey ?: \time());
				break;
			case StorageType::SIGN_ME:
				$sSubEmail = '.sign_me';
			case StorageType::CONFIG:
				if (empty($sEmail)) {
					return '';
				}
				if (\is_dir("{$this->sDataPath}/cfg")) {
					\SnappyMail\Upgrade::FileStorage($this->sDataPath);
				}
				$aEmail = \explode('@', $sEmail ?: 'nobody@unknown.tld');
				$sDomain = \trim(1 < \count($aEmail) ? \array_pop($aEmail) : '');
				$sFilePath = $this->sDataPath
					.'/'.\RainLoop\Utils::fixName($sDomain ?: 'unknown.tld')
					.'/'.\RainLoop\Utils::fixName(\implode('@', $aEmail) ?: '.unknown')
					.'/'.($sSubEmail ? \RainLoop\Utils::fixName($sSubEmail).'/' : '')
					.($sKey ? \RainLoop\Utils::fixName($sKey) : '');
				break;
			default:
				throw new \Exception("Invalid storage type {$iStorageType}");
		}

		if ($bMkDir && !empty($sFilePath) && !\is_dir(\dirname($sFilePath)))
		{
			if (!\mkdir(\dirname($sFilePath), 0700, true))
			{
				throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sFilePath.'"');
			}
		}

		// CleanupSignMeData
		if (StorageType::SIGN_ME === $iStorageType && $sKey && 0 === \random_int(0, 25) && \is_dir($sFilePath)) {
			\MailSo\Base\Utils::RecTimeDirRemove(\is_dir($sFilePath), 3600 * 24 * 30); // 30 days
		}

		return $sFilePath;
	}

	public function SetLogger(?\MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
	}
}
