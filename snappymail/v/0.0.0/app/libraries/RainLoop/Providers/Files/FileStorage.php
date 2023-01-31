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

	public function __construct(string $sStoragePath)
	{
		$this->aResources = array();
		$this->sDataPath = \rtrim(\trim($sStoragePath), '\\/');
	}

	public function GenerateLocalFullFileName(\RainLoop\Model\Account $oAccount, string $sKey) : string
	{
		return $this->generateFullFileName($oAccount, $sKey, true);
	}

	public function PutFile(\RainLoop\Model\Account $oAccount, string $sKey, /*resource*/ $rSource) : bool
	{
		$bResult = false;
		if ($rSource)
		{
			$rOpenOutput = \fopen($this->generateFullFileName($oAccount, $sKey, true), 'w+b');
			if ($rOpenOutput)
			{
				$bResult = (false !== \MailSo\Base\Utils::MultipleStreamWriter($rSource, array($rOpenOutput)));
				\fclose($rOpenOutput);
			}
		}
		return $bResult;
	}

	public function MoveUploadedFile(\RainLoop\Model\Account $oAccount, string $sKey, string $sSource) : bool
	{
		return \move_uploaded_file($sSource,
			$this->generateFullFileName($oAccount, $sKey, true));
	}

	/**
	 * @return resource|bool
	 */
	public function GetFile(\RainLoop\Model\Account $oAccount, string $sKey, string $sOpenMode = 'rb')
	{
		$mResult = false;
		$bCreate = !!\preg_match('/[wac]/', $sOpenMode);

		$sFileName = $this->generateFullFileName($oAccount, $sKey, $bCreate);
		if ($bCreate || \file_exists($sFileName))
		{
			$mResult = \fopen($sFileName, $sOpenMode);

			if (\is_resource($mResult))
			{
				$this->aResources[$sFileName] = $mResult;
			}
		}

		return $mResult;
	}

	public function GetFileName(\RainLoop\Model\Account $oAccount, string $sKey) /*: string|false*/
	{
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		return \file_exists($sFileName) ? $sFileName : false;
	}

	public function Clear(\RainLoop\Model\Account $oAccount, string $sKey) : bool
	{
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		if (\file_exists($sFileName)) {
			if (isset($this->aResources[$sFileName]) && \is_resource($this->aResources[$sFileName])) {
				\fclose($this->aResources[$sFileName]);
			}
			return \unlink($sFileName);
		}
		return false;
	}

	public function FileSize(\RainLoop\Model\Account $oAccount, string $sKey) /*: int|false*/
	{
		$sFileName = $this->generateFullFileName($oAccount, $sKey);
		return \file_exists($sFileName) ? \filesize($sFileName) : false;
	}

	public function FileExists(\RainLoop\Model\Account $oAccount, string $sKey) : bool
	{
		return \file_exists($this->generateFullFileName($oAccount, $sKey));
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 < $iTimeToClearInHours) {
			$iTimeToClear = 3600 * $iTimeToClearInHours;
			foreach (\glob("{$this->sDataPath}/*", GLOB_ONLYDIR) as $sDomain) {
				foreach (\glob("{$sDomain}/*", GLOB_ONLYDIR) as $sLocal) {
					\MailSo\Base\Utils::RecTimeDirRemove("{$sLocal}/.files", $iTimeToClear);
				}
			}
			// Old
			\MailSo\Base\Utils::RecTimeDirRemove("{$this->sDataPath}/files", $iTimeToClear);

			return true;
		}

		return false;
	}

	public function CloseAllOpenedFiles() : bool
	{
		if (\is_array($this->aResources) && \count($this->aResources))
		{
			foreach ($this->aResources as $sFileName => $rFile)
			{
				if (!empty($sFileName) && \is_resource($rFile))
				{
					\fclose($rFile);
				}
			}
		}

		return true;
	}

	private function generateFullFileName(\RainLoop\Model\Account $oAccount, string $sKey, bool $bMkDir = false) : string
	{
		if ($oAccount instanceof \RainLoop\Model\AdditionalAccount) {
			$sEmail = $oAccount->ParentEmail();
			$sSubEmail = $oAccount->Email();
		} else {
			$sEmail = $oAccount->Email();
			$sSubEmail = '';
		}

		$aEmail = \explode('@', $sEmail ?: 'nobody@unknown.tld');
		$sDomain = \trim(1 < \count($aEmail) ? \array_pop($aEmail) : '');
		$sFilePath = $this->sDataPath
			.'/'.\MailSo\Base\Utils::SecureFileName($sDomain ?: 'unknown.tld')
			.'/'.\MailSo\Base\Utils::SecureFileName(\implode('@', $aEmail) ?: '.unknown')
			.($sSubEmail ? '/'.\MailSo\Base\Utils::SecureFileName($sSubEmail) : '')
			.'/.files/'.\sha1($sKey);

		if ($bMkDir && !\is_dir(\dirname($sFilePath)) && !\mkdir(\dirname($sFilePath), 0700, true)) {
			throw new \RuntimeException('Can\'t make storage directory "'.$sFilePath.'"');
		}

		return $sFilePath;
	}

}
