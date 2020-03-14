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

	public function __construct($sStoragePath)
	{
		$this->aResources = array();
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 */
	public function GenerateLocalFullFileName($oAccount, string $sKey) : string
	{
		return $this->generateFullFileName($oAccount, $sKey, true);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param resource $rSource
	 *
	 */
	public function PutFile($oAccount, string $sKey, $rSource) : bool
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
	 *
	 */
	public function MoveUploadedFile($oAccount, string $sKey, string $sSource) : bool
	{
		return @\move_uploaded_file($sSource,
			$this->generateFullFileName($oAccount, $sKey, true));
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return resource|bool
	 */
	public function GetFile($oAccount, string $sKey, string $sOpenMode = 'rb')
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
	 *
	 */
	public function GetFileName($oAccount, string $sKey) : string
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
	 *
	 */
	public function Clear($oAccount, string $sKey) : bool
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
	 *
	 */
	public function FileSize($oAccount, string $sKey) : int
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
	 *
	 */
	public function FileExists($oAccount, string $sKey) : bool
	{
		return @\file_exists($this->generateFullFileName($oAccount, $sKey));
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 < $iTimeToClearInHours)
		{
			\MailSo\Base\Utils::RecTimeDirRemove($this->sDataPath, 60 * 60 * $iTimeToClearInHours, \time());
			return true;
		}

		return false;
	}

	public function CloseAllOpenedFiles() : bool
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
	 *
	 */
	private function generateFullFileName($oAccount, string $sKey, bool $bMkDir = false) : string
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
