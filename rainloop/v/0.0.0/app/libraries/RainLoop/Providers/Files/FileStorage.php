<?php

namespace RainLoop\Providers\Files;

class FileStorage implements \RainLoop\Providers\Files\IFiles
{
	/**
	 * @var array
	 */
	private $aResources;

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
		$this->aResources = array();
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return string
	 */
	public function GenerateLocalFullFileName($oAccount, $sKey)
	{
		return $this->generateFullFileName($oAccount, $sKey, true);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
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
			$rOpenOutput = @\fopen($this->generateFullFileName($oAccount, $sKey, true), 'w+b');
			if ($rOpenOutput)
			{
				$bResult = (false !== \MailSo\Base\Utils::MultipleStreamWriter($rSource, array($rOpenOutput)));
				@\fclose($rOpenOutput);
			}
		}
		return $bResult;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 * @param string $sSource
	 *
	 * @return bool
	 */
	public function MoveUploadedFile($oAccount, $sKey, $sSource)
	{
		return @\move_uploaded_file($sSource,
			$this->generateFullFileName($oAccount, $sKey, true));
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 * @param string $sOpenMode = 'rb'
	 *
	 * @return resource|bool
	 */
	public function GetFile($oAccount, $sKey, $sOpenMode = 'rb')
	{
		$mResult = false;
		$bCreate = !!\preg_match('/[wac]/', $sOpenMode);

		$sFileName = $this->generateFullFileName($oAccount, $sKey, $bCreate);
		if ($bCreate || \file_exists($sFileName))
		{
			$mResult = @\fopen($sFileName, $sOpenMode);

			if (\is_resource($mResult))
			{
				$this->aResources[$sFileName] = $mResult;
			}
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return string|bool
	 */
	public function GetFileName($oAccount, $sKey)
	{
		$mResult = false;
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = $sFileName;
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function Clear($oAccount, $sKey)
	{
		$mResult = true;
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			if (isset($this->aResources[$sFileName]) && \is_resource($this->aResources[$sFileName]))
			{
				@\fclose($this->aResources[$sFileName]);
			}

			$mResult = @\unlink($sFileName);
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return int|bool
	 */
	public function FileSize($oAccount, $sKey)
	{
		$mResult = false;
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		if (\file_exists($sFileName))
		{
			$mResult = \filesize($sFileName);
		}

		return $mResult;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function FileExists($oAccount, $sKey)
	{
		return @\file_exists($this->generateFullFileName($oAccount, $sKey));
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
	 * @return bool
	 */
	public function CloseAllOpenedFiles()
	{
		if (\is_array($this->aResources) && 0 < \count($this->aResources))
		{
			foreach ($this->aResources as $sFileName => $rFile)
			{
				if (!empty($sFileName) && \is_resource($rFile))
				{
					@\fclose($rFile);
				}
			}
		}

		return true;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sKey
	 * @param bool $bMkDir = false
	 *
	 * @return string
	 */
	private function generateFullFileName($oAccount, $sKey, $bMkDir = false)
	{
		$sEmail = $sSubEmail = '';
		if ($oAccount instanceof \RainLoop\Model\Account)
		{
			$sEmail = \preg_replace('/[^a-z0-9\-\.@]+/', '_', $oAccount->ParentEmailHelper());
			if ($oAccount->IsAdditionalAccount())
			{
				$sSubEmail = \preg_replace('/[^a-z0-9\-\.@]+/', '_', $oAccount->Email());
			}
		}

		if (empty($sEmail))
		{
			$sEmail = '__unknown__';
		}

		$sKeyPath = \sha1($sKey);
		$sKeyPath = \substr($sKeyPath, 0, 2).'/'.\substr($sKeyPath, 2, 2).'/'.$sKeyPath;

		$sFilePath = $this->sDataPath.'/'.
			\str_pad(\rtrim(\substr($sEmail, 0, 2), '@'), 2, '_').'/'.$sEmail.'/'.
			(0 < \strlen($sSubEmail) ? $sSubEmail.'/' : '').
			$sKeyPath;

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
