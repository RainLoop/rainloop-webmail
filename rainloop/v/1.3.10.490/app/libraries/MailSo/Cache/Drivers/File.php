<?php

namespace MailSo\Cache\Drivers;

/**
 * @category MailSo
 * @package Cache
 * @subpackage Drivers
 */
class File implements \MailSo\Cache\DriverInterface
{
	/**
	 * @var string
	 */
	private $sCacheFolder;

	/**
	 * @access private
	 *
	 * @param string $sCacheFolder
	 */
	private function __construct($sCacheFolder)
	{
		$this->sCacheFolder = $sCacheFolder;
		$this->sCacheFolder = rtrim(trim($this->sCacheFolder), '\\/').'/';
		if (!\is_dir($this->sCacheFolder))
		{
			@\mkdir($this->sCacheFolder, 0755);
		}
	}

	/**
	 * @param string $sCacheFolder
	 *
	 * @return \MailSo\Cache\Drivers\File
	 */
	public static function NewInstance($sCacheFolder)
	{
		return new self($sCacheFolder);
	}

	/**
	 * @param string $sKey
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Set($sKey, $sValue)
	{
		return false !== \file_put_contents($sPath = $this->generateCachedFileName($sKey, true), $sValue);
	}

	/**
	 * @param string $sKey
	 *
	 * @return string
	 */
	public function Get($sKey)
	{
		$sValue = '';
		$sPath = $this->generateCachedFileName($sKey);
		if (\file_exists($sPath))
		{
			$sValue = \file_get_contents($sPath);
		}

		return \is_string($sValue) ? $sValue : '';
	}

	/**
	 * @param string $sKey
	 *
	 * @return void
	 */
	public function Delete($sKey)
	{
		$sPath = $this->generateCachedFileName($sKey);
		if (\file_exists($sPath))
		{
			\unlink($sPath);
		}
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
			\MailSo\Base\Utils::RecTimeDirRemove($this->sCacheFolder, 60 * 60 * $iTimeToClearInHours, \time());
			return true;
		}
		
		return false;
	}

	/**
	 * @param string $sKey
	 * @param bool $bMkDir = false
	 *
	 * @return string
	 */
	private function generateCachedFileName($sKey, $bMkDir = false)
	{
		$sFilePath = '';
		if (3 < \strlen($sKey))
		{
			$sKeyPath = \sha1($sKey);
			$sKeyPath = \substr($sKeyPath, 0, 2).'/'.\substr($sKeyPath, 2, 2).'/'.$sKeyPath;

			$sFilePath = $this->sCacheFolder.'/'.$sKeyPath;
			if ($bMkDir && !\is_dir(\dirname($sFilePath)))
			{
				if (!\mkdir(\dirname($sFilePath), 0755, true))
				{
					$sFilePath = '';
				}
			}
		}

		return $sFilePath;
	}
}
