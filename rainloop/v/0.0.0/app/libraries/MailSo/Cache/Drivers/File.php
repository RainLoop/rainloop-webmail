<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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
	 * @var string
	 */
	private $sKeyPrefix;

	/**
	 * @access private
	 *
	 * @param string $sCacheFolder
	 * @param string $sKeyPrefix = ''
	 */
	private function __construct($sCacheFolder, $sKeyPrefix = '')
	{
		$this->sCacheFolder = $sCacheFolder;
		$this->sCacheFolder = rtrim(trim($this->sCacheFolder), '\\/').'/';

		$this->sKeyPrefix = $sKeyPrefix;
		if (!empty($this->sKeyPrefix))
		{
			$this->sKeyPrefix = \str_pad(\preg_replace('/[^a-zA-Z0-9_]/', '_',
				rtrim(trim($this->sKeyPrefix), '\\/')), 5, '_');

			$this->sKeyPrefix = '__/'.
				\substr($this->sKeyPrefix, 0, 2).'/'.\substr($this->sKeyPrefix, 2, 2).'/'.
				$this->sKeyPrefix.'/';
		}
	}

	/**
	 * @param string $sCacheFolder
	 * @param string $sKeyPrefix = ''
	 *
	 * @return \MailSo\Cache\Drivers\File
	 */
	public static function NewInstance($sCacheFolder, $sKeyPrefix = '')
	{
		return new self($sCacheFolder, $sKeyPrefix);
	}

	/**
	 * @param string $sKey
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Set($sKey, $sValue)
	{
		$sPath = $this->generateCachedFileName($sKey, true);
		return '' === $sPath ? false : false !== \file_put_contents($sPath, $sValue);
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
		if ('' !== $sPath && \file_exists($sPath))
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
		if ('' !== $sPath && \file_exists($sPath))
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

			$sFilePath = $this->sCacheFolder.$this->sKeyPrefix.$sKeyPath;
			if ($bMkDir && !\is_dir(\dirname($sFilePath)))
			{
				if (!@\mkdir(\dirname($sFilePath), 0755, true))
				{
					if (!@\mkdir(\dirname($sFilePath), 0755, true))
					{
						$sFilePath = '';
					}
				}
			}
		}

		return $sFilePath;
	}
}
