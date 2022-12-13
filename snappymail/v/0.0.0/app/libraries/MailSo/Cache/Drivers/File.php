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
	private string $sCacheFolder;

	private string $sKeyPrefix = '';

	function __construct(string $sCacheFolder, string $sKeyPrefix = '')
	{
		$this->sCacheFolder = \rtrim(\trim($sCacheFolder), '\\/').'/';
		if (!empty($sKeyPrefix)) {
			$sKeyPrefix = \str_pad(\preg_replace('/[^a-zA-Z0-9_]/', '_',
				\rtrim(\trim($sKeyPrefix), '\\/')), 5, '_');

			$this->sKeyPrefix = '__/'.
				\substr($sKeyPrefix, 0, 2).'/'.\substr($sKeyPrefix, 2, 2).'/'.
				$sKeyPrefix.'/';
		}
	}

	public function Set(string $sKey, string $sValue) : bool
	{
		$sPath = $this->generateCachedFileName($sKey, true);
		return '' === $sPath ? false : false !== \file_put_contents($sPath, $sValue);
	}

	public function Get(string $sKey) : string
	{
		$sValue = '';
		$sPath = $this->generateCachedFileName($sKey);
		if ('' !== $sPath && \file_exists($sPath)) {
			$sValue = \file_get_contents($sPath);
		}
		return \is_string($sValue) ? $sValue : '';
	}

	public function Delete(string $sKey) : void
	{
		$sPath = $this->generateCachedFileName($sKey);
		if ('' !== $sPath && \file_exists($sPath)) {
			\unlink($sPath);
		}
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 === $iTimeToClearInHours) {
			\MailSo\Base\Utils::RecRmDir($this->sCacheFolder);
		} else {
			\MailSo\Base\Utils::RecTimeDirRemove($this->sCacheFolder, 3600 * $iTimeToClearInHours);
		}
		return true;
	}

	private function generateCachedFileName(string $sKey, bool $bMkDir = false) : string
	{
		$sFilePath = '';
		if (3 < \strlen($sKey)) {
			$sKeyPath = \sha1($sKey);
			$sFilePath = $this->sCacheFolder . $this->sKeyPrefix
				. \substr($sKeyPath, 0, 2) . '/' . \substr($sKeyPath, 2, 2) . '/' . $sKeyPath;
			if ($bMkDir) {
				$dir = \dirname($sFilePath);
				if (!\is_dir($dir) && !\mkdir($dir, 0700, true)) {
					\error_log("mkdir({$dir}) failed");
					$sFilePath = '';
				}
			}
		}
		return $sFilePath;
	}
}
