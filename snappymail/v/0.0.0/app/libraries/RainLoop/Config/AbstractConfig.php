<?php

namespace RainLoop\Config;

abstract class AbstractConfig implements \JsonSerializable
{
	private string $sFile;

	private string $sAdditionalFile = '';

	private array $aData;

	private bool $bUseApcCache;

	private string $sFileHeader;

	public function __construct(string $sFileName, string $sFileHeader = '', string $sAdditionalFileName = '')
	{
		$this->sFile = \APP_PRIVATE_DATA.'configs/'.\trim($sFileName);

		$sAdditionalFileName = \trim($sAdditionalFileName);
		if ($sAdditionalFileName) {
			$sAdditionalFileName = \APP_PRIVATE_DATA.'configs/'.$sAdditionalFileName;
			if (\file_exists($this->sAdditionalFile)) {
				$this->sAdditionalFile = $sAdditionalFileName;
			}
		}

		$this->sFileHeader = $sFileHeader;
		$this->aData = $this->defaultValues();

		$this->bUseApcCache = defined('APP_USE_APCU_CACHE') && APP_USE_APCU_CACHE &&
			\MailSo\Base\Utils::FunctionsCallable(array('apcu_fetch', 'apcu_store'));
	}

	protected abstract function defaultValues() : array;

	public function IsInited() : bool
	{
		return \is_array($this->aData) && \count($this->aData);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return $this->aData;;
	}

	/**
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public function Get(string $sSection, string $sName, $mDefault = null)
	{
		return isset($this->aData[$sSection][$sName][0])
			? $this->aData[$sSection][$sName][0]
			: $mDefault;
	}

	/**
	 * @param mixed $mParamValue
	 */
	public function Set(string $sSectionKey, string $sParamKey, $mParamValue) : void
	{
		if (isset($this->aData[$sSectionKey][$sParamKey][0])) {
			if (!\is_scalar($mParamValue)) {
				$mParamValue = null;
			}
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
		} else if ('custom' === $sSectionKey) {
			$this->aData[$sSectionKey][$sParamKey] = array((string) $mParamValue);
		}
	}

	public function getDecrypted(string $sSection, string $sName, $mDefault = null)
	{
		// $salt = \basename($this->sFile) not possible due to RainLoop\Plugins\Property
		return isset($this->aData[$sSection][$sName][0])
			? \SnappyMail\Crypt::DecryptFromJSON($this->aData[$sSection][$sName][0], \APP_SALT)
			: $mDefault;
	}

	public function setEncrypted(string $sSectionKey, string $sParamKey, $mParamValue) : void
	{
		// $salt = \basename($this->sFile) not possible due to RainLoop\Plugins\Property
		$mParamValue = \SnappyMail\Crypt::EncryptToJSON($mParamValue, \APP_SALT);
		$this->Set($sSectionKey, $sParamKey, $mParamValue);
	}

	private function cacheKey() : string
	{
		return 'config:'.\sha1($this->sFile).':'.\sha1($this->sAdditionalFile).':';
	}

	private function loadDataFromCache() : bool
	{
		if ($this->bUseApcCache) {
			$iMTime = \filemtime($this->sFile);
			$iMTime = \is_int($iMTime) && 0 < $iMTime ? $iMTime : 0;

			$iATime = $this->sAdditionalFile ? \filemtime($this->sAdditionalFile) : 0;
			$iATime = \is_int($iATime) && 0 < $iATime ? $iATime : 0;

			if (0 < $iMTime) {
				$sKey = $this->cacheKey();

				$sTimeHash = \apcu_fetch($sKey.'time');
				if ($sTimeHash && $sTimeHash === \md5($iMTime.'/'.$iATime)) {
					$aFetchData = \apcu_fetch($sKey.'data');
					if (\is_array($aFetchData)) {
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
		if ($this->bUseApcCache) {
			$iMTime = \filemtime($this->sFile);
			$iMTime = \is_int($iMTime) && 0 < $iMTime ? $iMTime : 0;

			$iATime = $this->sAdditionalFile ? \filemtime($this->sAdditionalFile) : 0;
			$iATime = \is_int($iATime) && 0 < $iATime ? $iATime : 0;

			if (0 < $iMTime) {
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
		if ($this->bUseApcCache) {
			$sKey = $this->cacheKey();

			\apcu_delete($sKey.'time');
			\apcu_delete($sKey.'data');

			return true;
		}

		return false;
	}

	public function Load() : bool
	{
		$sFile = $this->sFile;
		if (!\file_exists($sFile) && \str_ends_with($sFile, '.json')) {
			$sFile = \str_replace('.json', '.ini', $sFile);
		}
		if (\file_exists($sFile) && \is_readable($sFile)) {
			if ($this->loadDataFromCache()) {
				return true;
			}

			if (\str_ends_with($sFile, '.json')) {
				$aData = \json_decode(\file_get_contents($sFile), true);
			} else {
				$aData = \parse_ini_file($sFile, true);
			}
			if ($aData && \count($aData)) {
				foreach ($aData as $sSectionKey => $aSectionValue) {
					if (\is_array($aSectionValue)) {
						foreach ($aSectionValue as $sParamKey => $mParamValue) {
							$this->Set($sSectionKey, $sParamKey, $mParamValue);
						}
					}
				}

				unset($aData);

				if (\file_exists($this->sAdditionalFile) && \is_readable($this->sAdditionalFile)) {
					if (\str_ends_with($this->sAdditionalFile, '.json')) {
						$aData = \json_decode(\file_get_contents($this->sAdditionalFile), true);
					} else {
						$aData = \parse_ini_file($this->sAdditionalFile, true);
					}
					if ($aData && \count($aData)) {
						foreach ($aData as $sSectionKey => $aSectionValue) {
							if (\is_array($aSectionValue)) {
								foreach ($aSectionValue as $sParamKey => $mParamValue) {
									$this->Set($sSectionKey, $sParamKey, $mParamValue);
								}
							}
						}
					}

					unset($aData);
				}

				$this->storeDataToCache();

				return true;
			}
		}

		return $this->Save();
	}

	public function Save() : bool
	{
		if (\file_exists($this->sFile) && !\is_writable($this->sFile)) {
			return false;
		}

		if (\str_ends_with($this->sFile, '.json')) {
			$this->clearCache();
			\RainLoop\Utils::saveFile($this->sFile, \json_encode($this, \JSON_PRETTY_PRINT | \JSON_UNESCAPED_SLASHES));
			// Remove old .ini file
			$sFile = \str_replace('.json', '.ini', $this->sFile);
			\file_exists($sFile) && \unlink($sFile);
			return true;
		}

		$sNewLine = "\n";

		$aResultLines = array();

		foreach ($this->aData as $sSectionKey => $aSectionValue) {
			if (\is_array($aSectionValue)) {
				$aResultLines[] = '';
				$aResultLines[] = '['.$sSectionKey.']';
				$bFirst = true;

				foreach ($aSectionValue as $sParamKey => $mParamValue) {
					if (\is_array($mParamValue)) {
						// Add comments
						if (!empty($mParamValue[1])) {
							if (!$bFirst) {
								$aResultLines[] = '';
							}
							foreach (\explode("\n", \str_replace("\r", '', $mParamValue[1])) as $sLine) {
								$aResultLines[] = '; ' . $sLine;
							}
						}

						// Add value
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

		\RainLoop\Utils::saveFile($this->sFile,
			(\strlen($this->sFileHeader) ? $this->sFileHeader : '').
			$sNewLine.\implode($sNewLine, $aResultLines));

		return true;
	}
}
