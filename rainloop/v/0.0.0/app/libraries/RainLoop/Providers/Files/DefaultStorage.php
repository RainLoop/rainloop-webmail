<?php

namespace RainLoop\Providers\Files;

class DefaultStorage implements \RainLoop\Providers\Files\FilesInterface
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
	 * @param \RainLoop\Account $oAccount
	 * @param string $sKey
	 * @param resource $rSource
	 *
	 * @return bool
	 */
	public function PutFile($oAccount, $sKey, $rSource)
	{
		$bResult = false;
		if ($rSource)
		{
			$rOpenOutput = @\fopen($this->generateFileName($oAccount, $sKey, true), 'w+b');
			if ($rOpenOutput)
			{
				$bResult = (false !== \MailSo\Base\Utils::MultipleStreamWriter($rSource, array($rOpenOutput)));
				@\fclose($rOpenOutput);
			}
		}
		return $bResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sKey
	 * @param string $sSource
	 *
	 * @return bool
	 */
	public function MoveUploadedFile($oAccount, $sKey, $sSource)
	{
		return @\move_uploaded_file($sSource,
			$this->generateFileName($oAccount, $sKey, true));
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sKey
	 * @param string $sOpenMode = 'rb'
	 *
	 * @return resource|bool
	 */
	public function GetFile($oAccount, $sKey, $sOpenMode = 'rb')
	{
		$mResult = false;
		$bCreate = !!\preg_match('/[wac]/', $sOpenMode);

		$sFileName = $this->generateFileName($oAccount, $sKey, $bCreate);
		if ($bCreate || \file_exists($sFileName))
		{
			$mResult = @\fopen($sFileName, $sOpenMode);
		}
		
		return $mResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sKey
	 *
	 * @return string|bool
	 */
	public function GetFileName($oAccount, $sKey)
	{
		$mResult = false;
		$sFileName = $this->generateFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = $sFileName;
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function Clear($oAccount, $sKey)
	{
		$mResult = true;
		$sFileName = $this->generateFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = @\unlink($sFileName);
		}
		
		return $mResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sKey
	 *
	 * @return int|bool
	 */
	public function FileSize($oAccount, $sKey)
	{
		$mResult = false;
		$sFileName = $this->generateFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = \filesize($sFileName);
		}
		
		return $mResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function FileExists($oAccount, $sKey)
	{
		return @\file_exists($this->generateFileName($oAccount, $sKey));
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
			\MailSo\Base\Utils::RecTimeDirRemove($this->sDataPath, 60 * 60 * $iTimeToClearInHours, \time());
			return true;
		}

		return false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sKey
	 * @param bool $bMkDir = false
	 *
	 * @return string
	 */
	private function generateFileName($oAccount, $sKey, $bMkDir = false)
	{
		$sEmail = \preg_replace('/[^a-z0-9\-\.@]+/', '_', 
			('' === $oAccount->ParentEmail() ? '' : $oAccount->ParentEmail().'/').$oAccount->Email());

		$sKeyPath = \sha1($sKey);
		$sKeyPath = \substr($sKeyPath, 0, 2).'/'.\substr($sKeyPath, 2, 2).'/'.$sKeyPath;

		$sFilePath = $this->sDataPath.'/'.rtrim(substr($sEmail, 0, 2), '@').'/'.$sEmail.'/'.$sKeyPath;

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
