<?php

namespace RainLoop\Config;

abstract class AbstractConfig
{
	/**
	 * @var string
	 */
	private $sFile;

	/**
	 * @var string
	 */
	private $sAdditionalFile;

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

	public function __construct(string $sFileName, string $sFileHeader = '', string $sAdditionalFileName = '')
	{
		$this->sFile = \APP_PRIVATE_DATA.'configs/'.\trim($sFileName);

		$sAdditionalFileName = \trim($sAdditionalFileName);
		$this->sAdditionalFile = \APP_PRIVATE_DATA.'configs/'.$sAdditionalFileName;
		$this->sAdditionalFile = 0 < \strlen($sAdditionalFileName) &&
			\file_exists($this->sAdditionalFile) ? $this->sAdditionalFile : '';

		$this->sFileHeader = $sFileHeader;
		$this->aData = $this->defaultValues();

		$this->bUseApcCache = APP_USE_APCU_CACHE &&
			\MailSo\Base\Utils::FunctionExistsAndEnabled(array('apcu_fetch', 'apcu_store'));
	}

	protected abstract function defaultValues() : array;

	public function IsInited() : bool
	{
		return \is_array($this->aData) && 0 < \count($this->aData);
	}

	/**
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public function Get(string $sSection, string $sName, $mDefault = null)
	{
		$mResult = $mDefault;
		if (isset($this->aData[$sSection][$sName][0]))
		{
			$mResult = $this->aData[$sSection][$sName][0];
		}
		return $mResult;
	}

	/**
	 * @param mixed $mParamValue
	 */
	public function Set(string $sSectionKey, string $sParamKey, $mParamValue) : void
	{
		if (isset($this->aData[$sSectionKey][$sParamKey][0]))
		{
			switch (\gettype($this->aData[$sSectionKey][$sParamKey][0]))
			{
				case 'boolean':
					$this->aData[$sSectionKey][$sParamKey][0] = (bool) $mParamValue;
					break;
				case 'double':
					$this->aData[$sSectionKey][$sParamKey][0] = (float) $mParamValue;
					break;
				case 'integer':
					$this->aData[$sSectionKey][$sParamKey][0] = (int) $mParamValue;
					break;
				case 'string':
				default:
					$this->aData[$sSectionKey][$sParamKey][0] = (string) $mParamValue;
					break;
			}
		}
		else if ('custom' === $sSectionKey)
		{
			$this->aData[$sSectionKey][$sParamKey] = array((string) $mParamValue);
		}
	}

	private function cacheKey() : string
	{
		return 'config:'.\sha1($this->sFile).':'.\sha1($this->sAdditionalFile).':';
	}

	private function loadDataFromCache() : bool
	{
		if ($this->bUseApcCache)
		{
			$iMTime = \filemtime($this->sFile);
			$iMTime = \is_int($iMTime) && 0 < $iMTime ? $iMTime : 0;

			$iATime = $this->sAdditionalFile ? \filemtime($this->sAdditionalFile) : 0;
			$iATime = \is_int($iATime) && 0 < $iATime ? $iATime : 0;

			if (0 < $iMTime)
			{
				$sKey = $this->cacheKey();

				$sTimeHash = \apcu_fetch($sKey.'time');
				if ($sTimeHash && $sTimeHash === \md5($iMTime.'/'.$iATime))
				{
					$aFetchData = \apcu_fetch($sKey.'data');
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

	private function storeDataToCache() : bool
	{
		if ($this->bUseApcCache)
		{
			$iMTime = \filemtime($this->sFile);
			$iMTime = \is_int($iMTime) && 0 < $iMTime ? $iMTime : 0;

			$iATime = $this->sAdditionalFile ? \filemtime($this->sAdditionalFile) : 0;
			$iATime = \is_int($iATime) && 0 < $iATime ? $iATime : 0;

			if (0 < $iMTime)
			{
				$sKey = $this->cacheKey();

				\apcu_store($sKey.'time', \md5($iMTime.'/'.$iATime));
				\apcu_store($sKey.'data', $this->aData);

				return true;
			}
		}

		return false;
	}

	private function clearCache() : bool
	{
		if ($this->bUseApcCache)
		{
			$sKey = $this->cacheKey();

			\apcu_delete($sKey.'time');
			\apcu_delete($sKey.'data');

			return true;
		}

		return false;
	}

	public function IsFileExists() : bool
	{
		return \file_exists($this->sFile);
	}

	public function Load() : bool
	{
		if (\file_exists($this->sFile) && \is_readable($this->sFile))
		{
			if ($this->loadDataFromCache())
			{
				return true;
			}

			$aData = \RainLoop\Utils::CustomParseIniFile($this->sFile, true);
			if (0 < \count($aData))
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

				unset($aData);

				if (\file_exists($this->sAdditionalFile) && \is_readable($this->sAdditionalFile))
				{
					$aSubData = \RainLoop\Utils::CustomParseIniFile($this->sAdditionalFile, true);
					if (\is_array($aSubData) && 0 < \count($aSubData))
					{
						foreach ($aSubData as $sSectionKey => $aSectionValue)
						{
							if (\is_array($aSectionValue))
							{
								foreach ($aSectionValue as $sParamKey => $mParamValue)
								{
									$this->Set($sSectionKey, $sParamKey, $mParamValue);
								}
							}
						}
					}

					unset($aSubData);
				}

				$this->storeDataToCache();

				return true;
			}
		}

		return false;
	}

	public function Save() : bool
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
							$aDesk = \array_map(function ($sLine) {
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
							case 'boolean':
								$sValue = $mParamValue[0] ? 'On' : 'Off';
								break;
							case 'double':
							case 'integer':
								$sValue = $mParamValue[0];
								break;
							case 'string':
							default:
								$sValue = '"'.\str_replace('"', '\\"', $mParamValue[0]).'"';
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
