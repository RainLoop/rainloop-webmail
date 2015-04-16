<?php

namespace RainLoop\Config;

abstract class AbstractConfig
{
	/**
	 * @var string
	 */
	private $sFile;

	/**
	 * @var array
	 */
	private $aData;

	/**
	 * @var bool
	 */
	private $bUseApcCache;

	/**
	 * @var string
	 */
	private $sFileHeader;

	/**
	 * @param string $sFileName
	 * @param string $sFileHeader = ''
	 *
	 * @return void
	 */
	public function __construct($sFileName, $sFileHeader = '')
	{
		$this->sFile = \APP_PRIVATE_DATA.'configs/'.$sFileName;
		$this->sFileHeader = $sFileHeader;
		$this->aData = $this->defaultValues();

		$this->bUseApcCache = APP_USE_APC_CACHE &&
			\MailSo\Base\Utils::FunctionExistsAndEnabled(array('apc_fetch', 'apc_store'));
	}

	/**
	 * @return array
	 */
	protected abstract function defaultValues();

	/**
	 * @return bool
	 */
	public function IsInited()
	{
		return \is_array($this->aData) && 0 < \count($this->aData);
	}

	/**
	 * @param string $sSection
	 * @param string $sName
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public function Get($sSection, $sName, $mDefault = null)
	{
		$mResult = $mDefault;
		if (isset($this->aData[$sSection][$sName][0]))
		{
			$mResult = $this->aData[$sSection][$sName][0];
		}
		return $mResult;
	}

	/**
	 * @param string $sSectionKey
	 * @param string $sParamKey
	 * @param mixed $mParamValue
	 *
	 * @return void
	 */
	public function Set($sSectionKey, $sParamKey, $mParamValue)
	{
		if (isset($this->aData[$sSectionKey][$sParamKey][0]))
		{
			$sType = \gettype($this->aData[$sSectionKey][$sParamKey][0]);
			switch ($sType)
			{
				default:
				case 'string':
					$this->aData[$sSectionKey][$sParamKey][0] = (string) $mParamValue;
					break;
				case 'int':
				case 'integer':
					$this->aData[$sSectionKey][$sParamKey][0] = (int) $mParamValue;
					break;
				case 'bool':
				case 'boolean':
					$this->aData[$sSectionKey][$sParamKey][0] = (bool) $mParamValue;
					break;
			}
		}
		else if ('custom' === $sSectionKey)
		{
			$this->aData[$sSectionKey][$sParamKey] = array((string) $mParamValue);
		}
	}

	/**
	 * @return string
	 */
	private function cacheKey()
	{
		return 'config:'.\sha1($this->sFile).':';
	}

	/**
	 * @return bool
	 */
	private function loadDataFromCache()
	{
		if ($this->bUseApcCache)
		{
			$iMTime = @\filemtime($this->sFile);
			if (\is_int($iMTime) && 0 < $iMTime)
			{
				$sKey = $this->cacheKey();

				$iTime = \apc_fetch($sKey.'time');
				if ($iTime && $iMTime === (int) $iTime)
				{
					$aFetchData = \apc_fetch($sKey.'data');
					if (\is_array($aFetchData))
					{
						$this->aData = $aFetchData;
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * @return bool
	 */
	private function storeDataToCache()
	{
		if ($this->bUseApcCache)
		{
			$iMTime = @\filemtime($this->sFile);
			if (\is_int($iMTime) && 0 < $iMTime)
			{
				$sKey = $this->cacheKey();

				\apc_store($sKey.'time', $iMTime);
				\apc_store($sKey.'data', $this->aData);

				return true;
			}
		}

		return false;
	}

	/**
	 * @return bool
	 */
	private function clearCache()
	{
		if ($this->bUseApcCache)
		{
			$sKey = $this->cacheKey();

			\apc_delete($sKey.'time');
			\apc_delete($sKey.'data');

			return true;
		}

		return false;
	}

	/**
	 * @return bool
	 */
	public function Load()
	{
		if (\file_exists($this->sFile) && \is_readable($this->sFile))
		{
			if ($this->loadDataFromCache())
			{
				return true;
			}

			$aData = \RainLoop\Utils::CustomParseIniFile($this->sFile, true);
			if (\is_array($aData) && 0 < count($aData))
			{
				foreach ($aData as $sSectionKey => $aSectionValue)
				{
					if (\is_array($aSectionValue))
					{
						foreach ($aSectionValue as $sParamKey => $mParamValue)
						{
							$this->Set($sSectionKey, $sParamKey, $mParamValue);
						}
					}
				}

				$this->storeDataToCache();

				return true;
			}
		}

		return false;
	}

	/**
	 * @return bool
	 */
	public function Save()
	{
		if (\file_exists($this->sFile) && !\is_writable($this->sFile))
		{
			return false;
		}

		$sNewLine = "\n";

		$aResultLines = array();

		foreach ($this->aData as $sSectionKey => $aSectionValue)
		{
			if (\is_array($aSectionValue))
			{
				$aResultLines[] = '';
				$aResultLines[] = '['.$sSectionKey.']';
				$bFirst = true;

				foreach ($aSectionValue as $sParamKey => $mParamValue)
				{
					if (\is_array($mParamValue))
					{
						if (!empty($mParamValue[1]))
						{
							$sDesk = \str_replace("\r", '', $mParamValue[1]);
							$aDesk = \explode("\n", $sDesk);
							$aDesk = \array_map(function (&$sLine) {
								return '; '.$sLine;
							}, $aDesk);

							if (!$bFirst)
							{
								$aResultLines[] = '';
							}

							$aResultLines[] = \implode($sNewLine, $aDesk);
						}

						$bFirst = false;

						$sValue = '""';
						switch (\gettype($mParamValue[0]))
						{
							default:
							case 'string':
								$sValue = '"'.$mParamValue[0].'"';
								break;
							case 'int':
							case 'integer':
								$sValue = $mParamValue[0];
								break;
							case 'bool':
							case 'boolean':
								$sValue = $mParamValue[0] ? 'On' : 'Off';
								break;
						}

						$aResultLines[] = $sParamKey.' = '.$sValue;
					}
				}
			}
		}

		$this->clearCache();
		return false !== \file_put_contents($this->sFile,
			(0 < \strlen($this->sFileHeader) ? $this->sFileHeader : '').
			$sNewLine.\implode($sNewLine, $aResultLines));
	}
}
