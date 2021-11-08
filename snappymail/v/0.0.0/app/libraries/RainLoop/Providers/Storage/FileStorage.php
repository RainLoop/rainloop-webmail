<?php

namespace RainLoop\Providers\Storage;

use \RainLoop\Providers\Storage\Enumerations\StorageType;

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

	public function __construct(string $sStoragePath, bool $bLocal = false)
	{
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
		$this->bLocal = !!$bLocal;
		$this->oLogger = null;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 */
	public function Put($oAccount, int $iStorageType, string $sKey, string $sValue) : bool
	{
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey, true);
		return $sFileName && false !== \file_put_contents($sFileName, $sValue);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 * @param mixed $mDefault = false
	 *
	 * @return mixed
	 */
	public function Get($oAccount, int $iStorageType, string $sKey, $mDefault = false)
	{
		$mValue = false;
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey);
		if ($sFileName && \file_exists($sFileName)) {
			$mValue = \file_get_contents($sFileName);
		} else {
			$sFileName = $this->generateFileNameOld($oAccount, $iStorageType, $sKey);
			if ($sFileName && \file_exists($sFileName)) {
				$mValue = \file_get_contents($sFileName);
				$this->Put($oAccount, $iStorageType, $sKey, $mValue);
				\unlink($sFileName);
			}
		}

		return false === $mValue ? $mDefault : $mValue;
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $oAccount
	 */
	public function Clear($oAccount, int $iStorageType, string $sKey) : bool
	{
		$mResult = true;
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey);
		if ($sFileName && \file_exists($sFileName)) {
			$mResult = \unlink($sFileName);
		} else {
			$sFileName = $this->generateFileNameOld($oAccount, $iStorageType, $sKey);
			if ($sFileName && \file_exists($sFileName)) {
				$mResult = \unlink($sFileName);
			}
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Model\Account|string $oAccount
	 */
	public function DeleteStorage($oAccount) : bool
	{
		$sPath = $this->generateFileName($oAccount, StorageType::CONFIG, '', false, true);
		if ($sPath && \is_dir($sPath)) {
			\MailSo\Base\Utils::RecRmDir($sPath);
		}

		$sPath = $this->generateFileNameOld($oAccount, StorageType::USER, '', false, true);
		if ($sPath && \is_dir($sPath)) {
			\MailSo\Base\Utils::RecRmDir($sPath);
		}

		$sPath = $this->generateFileNameOld($oAccount, StorageType::CONFIG, '', false, true);
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
	 * Replace control characters, ampersand, spaces and reserved characters (based on Win95 VFAT)
	 * en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
	 */
	private static function fixName($filename)
	{
		return \preg_replace('#[|\\\\?*<":>+\\[\\]/&\\s\\pC]#su', '-', $filename);
	}

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	private function generateFileName($mAccount, int $iStorageType, string $sKey, bool $bMkDir = false, bool $bForDeleteAction = false) : string
	{
		$sEmail = $sSubEmail = '';
		if (null === $mAccount) {
			$iStorageType = StorageType::NOBODY;
		} else if ($mAccount instanceof \RainLoop\Model\Account) {
			$sEmail = $mAccount->ParentEmailHelper();
			if ($this->bLocal && $mAccount->IsAdditionalAccount() && !$bForDeleteAction)
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
				$aEmail = \explode('@', $sEmail ?: 'nobody@unknown.tld');
				$sDomain = \trim(1 < \count($aEmail) ? \array_pop($aEmail) : '');
				$sFilePath = $this->sDataPath
					.'/'.static::fixName($sDomain ?: 'unknown.tld')
					.'/'.static::fixName(\implode('@', $aEmail) ?: '.unknown')
					.'/'.($sSubEmail ? static::fixName($sSubEmail).'/' : '')
					.($sKey ? static::fixName($sKey) : '');
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

	/**
	 * Old RainLoop structure
	 */
	private function generateFileNameOld($mAccount, int $iStorageType, string $sKey, bool $bMkDir = false, bool $bForDeleteAction = false) : string
	{
		if (null === $mAccount)
		{
			$iStorageType = StorageType::NOBODY;
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

		$sEmail = \preg_replace('/[^a-z0-9\-\.@]+/i', '_', $sEmail);
		$sSubEmail = \preg_replace('/[^a-z0-9\-\.@]+/i', '_', $sSubEmail);

		$sTypePath = $sKeyPath = '';
		switch ($iStorageType)
		{
			default:
			case StorageType::USER:
			case StorageType::NOBODY:
				$sTypePath = 'data';
				$sKeyPath = \md5($sKey);
				$sKeyPath = \substr($sKeyPath, 0, 2).'/'.$sKeyPath;
				break;
			case StorageType::CONFIG:
				$sTypePath = 'cfg';
				$sKeyPath = \preg_replace('/[_]+/', '_', \preg_replace('/[^a-zA-Z0-9\/]/', '_', $sKey));
				break;
		}

		$sFilePath = '';
		if (StorageType::NOBODY === $iStorageType)
		{
			$sFilePath = $this->sDataPath.'/'.$sTypePath.'/__nobody__/'.$sKeyPath;
		}
		else if (!empty($sEmail))
		{
			$sFilePath = $this->sDataPath.'/'.$sTypePath.'/'.
				\str_pad(\rtrim(\substr($sEmail, 0, 2), '@'), 2, '_').'/'.$sEmail.'/'.
				(\strlen($sSubEmail) ? $sSubEmail.'/' : '').
				($bForDeleteAction ? '' : $sKeyPath);
		}

		if ($bMkDir && !$bForDeleteAction && !empty($sFilePath) && !\is_dir(\dirname($sFilePath)))
		{
			if (!\mkdir(\dirname($sFilePath), 0700, true))
			{
				throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sFilePath.'"');
			}
		}

		return $sFilePath;
	}

	public function SetLogger(?\MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
	}
}
