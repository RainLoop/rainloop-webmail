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
	 * @param resource $rSource
	 *
	 * @return bool
	 */
	public function PutFile($oAccount, $iStorageType, $sKey, $rSource)
	{
		$bResult = false;
		if ($rSource)
		{
			$rOpenOutput = @\fopen($this->generateFileName($oAccount, $iStorageType, $sKey, true), 'w+b');
			if ($rOpenOutput)
			{
				$bResult = (false !== \MailSo\Base\Utils::MultipleStreamWriter($rSource, array($rOpenOutput)));
				@\fclose($rOpenOutput);
			}
		}
		return $bResult;
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 * @param string $sSource
	 *
	 * @return bool
	 */
	public function MoveUploadedFile($oAccount, $iStorageType, $sKey, $sSource)
	{
		return @\move_uploaded_file($sSource,
			$this->generateFileName($oAccount, $iStorageType, $sKey, true));
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sSource
	 * @param string $sDest
	 *
	 * @return bool
	 */
	public function SaveFileToBase64File($oAccount, $iStorageType, $sSource, $sDest)
	{
		$bResult = false;
		$rOpenInput = @\fopen($this->generateFileName($oAccount, $iStorageType, $sSource), 'rb');
		$rOpenOutput = @\fopen($this->generateFileName($oAccount, $iStorageType, $sDest, true), 'wb');

		if ($rOpenInput && $rOpenOutput)
		{
			$aParam = array('line-length' => 76, 'line-break-chars' => "\r\n");
			$rFilter = @\stream_filter_append($rOpenOutput, 'convert.base64-encode', STREAM_FILTER_WRITE, $aParam);
			if (@\is_resource($rFilter))
			{
				$bResult = true;
			}
		}

		if ($bResult)
		{
			$bResult = (false !== \MailSo\Base\Utils::MultipleStreamWriter($rOpenInput, array($rOpenOutput)));
		}

		if ($rOpenInput && $rOpenOutput)
		{
			@\fclose($rOpenInput);
			@\fclose($rOpenOutput);
		}

		return $bResult;
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
	 * @param string $sOpenMode = 'rb'
	 *
	 * @return resource | bool
	 */
	public function GetFile($oAccount, $iStorageType, $sKey, $sOpenMode = 'rb')
	{
		$mResult = false;
		$bCreate = !!\preg_match('/[wac]/', $sOpenMode);

		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey, $bCreate);
		if ($bCreate || \file_exists($sFileName))
		{
			$mResult = @\fopen($sFileName, $sOpenMode);
		}
		
		return $mResult;
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iStorageType
	 * @param string $sKey
	 *
	 * @return string | bool
	 */
	public function GetFileName($oAccount, $iStorageType, $sKey)
	{
		$mResult = false;
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = $sFileName;
		}

		return $mResult;
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
	 *
	 * @return int | bool
	 */
	public function FileSize($oAccount, $iStorageType, $sKey)
	{
		$mResult = false;
		$sFileName = $this->generateFileName($oAccount, $iStorageType, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = \filesize($sFileName);
		}
		
		return $mResult;
	}

	/**
	 * @param \RainLoop\Account|null $oAccount
	 * @param int $iType
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function FileExists($oAccount, $iStorageType, $sKey)
	{
		return @\file_exists($this->generateFileName($oAccount, $iStorageType, $sKey));
	}

	/**
	 * @param int $iTimeToClearInHours = 24
	 *
	 * @return bool
	 */
	public function GC($iTimeToClearInHours = 24)
	{
		if (0 < $iTimeToClearInHours)
		{
			\MailSo\Base\Utils::RecTimeDirRemove($this->sDataPath.'/tmp', 60 * 60 * $iTimeToClearInHours, \time());
			return true;
		}

		return false;
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
		$sEmail = $oAccount ? \preg_replace('/[^a-z0-9\-\.@]+/', '_', 
			('' === $oAccount->ParentEmail() ? '' : $oAccount->ParentEmail().'/').$oAccount->Email()) : '';

		$sTypePath = $sKeyPath = '';
		switch ($iStorageType)
		{
			case \RainLoop\Providers\Storage\Enumerations\StorageType::TEMP:
				$sTypePath = 'tmp';
				$sKeyPath = \md5($sKey);
				$sKeyPath = \substr($sKeyPath, 0, 2).'/'.$sKeyPath;
				break;
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
			if (!@\mkdir(\dirname($sFilePath), 0777, true))
			{
				throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sFilePath.'"');
			}
		}

		return $sFilePath;
	}
}
