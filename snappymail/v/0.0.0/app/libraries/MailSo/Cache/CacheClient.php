<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Cache;

/**
 * @category MailSo
 * @package Cache
 */
class CacheClient
{
	/**
	 * @var \MailSo\Cache\DriverInterface
	 */
	private $oDriver;

	private string $sCacheIndex = '';

	public function Set(string $sKey, string $sValue) : bool
	{
		return $this->oDriver ? $this->oDriver->Set($sKey.$this->sCacheIndex, $sValue) : false;
	}

	public function SetTimer(string $sKey) : bool
	{
		return $this->Set($sKey.'/TIMER', time());
	}

	public function SetLock(string $sKey) : bool
	{
		return $this->Set($sKey.'/LOCK', '1');
	}

	public function RemoveLock(string $sKey) : bool
	{
		return $this->Set($sKey.'/LOCK', '0');
	}

	public function GetLock(string $sKey) : bool
	{
		return '1' === $this->Get($sKey.'/LOCK');
	}

	public function Get(string $sKey, bool $bClearAfterGet = false)
	{
		$sValue = '';

		if ($this->oDriver) {
			$sValue = $this->oDriver->Get($sKey.$this->sCacheIndex);
		}

		if ($bClearAfterGet) {
			$this->Delete($sKey);
		}

		return $sValue;
	}

	public function GetTimer(string $sKey) : int
	{
		$iTimer = 0;
		$sValue = $this->Get($sKey.'/TIMER');
		if (\strlen($sValue) && \is_numeric($sValue)) {
			$iTimer = (int) $sValue;
		}

		return $iTimer;
	}

	public function Delete(string $sKey) : self
	{
		if ($this->oDriver) {
			$this->oDriver->Delete($sKey.$this->sCacheIndex);
		}

		return $this;
	}

	public function SetDriver(DriverInterface $oDriver) : self
	{
		$this->oDriver = $oDriver;

		return $this;
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		return $this->oDriver ? $this->oDriver->GC($iTimeToClearInHours) : false;
	}

	public function IsInited() : bool
	{
		return !!$this->oDriver;
	}

	public function SetCacheIndex(string $sCacheIndex) : self
	{
		$this->sCacheIndex = \strlen($sCacheIndex) ? "\x0".$sCacheIndex : '';

		return $this;
	}

	public function Verify(bool $bCache = false) : bool
	{
		if ($this->oDriver) {
			$sCacheData = \gmdate('Y-m-d-H');
			if ($bCache && $sCacheData === $this->Get('__verify_key__')) {
				return true;
			}

			return $this->Set('__verify_key__', $sCacheData);
		}

		return false;
	}
}
