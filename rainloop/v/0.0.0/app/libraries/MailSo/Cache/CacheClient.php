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

	/**
	 * @var string
	 */
	private $sCacheIndex;

	/**
	 * @access private
	 */
	private function __construct()
	{
		$this->oDriver = null;
		$this->sCacheIndex = '';
	}

	public static function NewInstance() : self
	{
		return new self();
	}

	/**
	 * @param string $sKey
	 * @param string $sValue
	 */
	public function Set($sKey, $sValue) : bool
	{
		return $this->oDriver ? $this->oDriver->Set($sKey.$this->sCacheIndex, $sValue) : false;
	}

	/**
	 * @param string $sKey
	 */
	public function SetTimer($sKey) : bool
	{
		return $this->Set($sKey.'/TIMER', time());
	}

	/**
	 * @param string $sKey
	 */
	public function SetLock($sKey) : bool
	{
		return $this->Set($sKey.'/LOCK', '1');
	}

	/**
	 * @param string $sKey
	 */
	public function RemoveLock($sKey) : bool
	{
		return $this->Set($sKey.'/LOCK', '0');
	}

	/**
	 * @param string $sKey
	 */
	public function GetLock($sKey) : bool
	{
		return '1' === $this->Get($sKey.'/LOCK');
	}

	/**
	 * @param string $sKey
	 * @param string $bClearAfterGet = false
	 *
	 * @return string
	 */
	public function Get($sKey, $bClearAfterGet = false)
	{
		$sValue = '';

		if ($this->oDriver)
		{
			$sValue = $this->oDriver->Get($sKey.$this->sCacheIndex);
		}

		if ($bClearAfterGet)
		{
			$this->Delete($sKey);
		}

		return $sValue;
	}

	/**
	 * @param string $sKey
	 *
	 * @return int
	 */
	public function GetTimer($sKey)
	{
		$iTimer = 0;
		$sValue = $this->Get($sKey.'/TIMER');
		if (0 < strlen($sValue) && is_numeric($sValue))
		{
			$iTimer = (int) $sValue;
		}

		return $iTimer;
	}

	/**
	 * @param string $sKey
	 */
	public function Delete($sKey) : self
	{
		if ($this->oDriver)
		{
			$this->oDriver->Delete($sKey.$this->sCacheIndex);
		}

		return $this;
	}

	/**
	 * @param \MailSo\Cache\DriverInterface $oDriver
	 */
	public function SetDriver(\MailSo\Cache\DriverInterface $oDriver) : self
	{
		$this->oDriver = $oDriver;

		return $this;
	}

	/**
	 * @param int $iTimeToClearInHours = 24
	 */
	public function GC($iTimeToClearInHours = 24) : bool
	{
		return $this->oDriver ? $this->oDriver->GC($iTimeToClearInHours) : false;
	}

	public function IsInited() : bool
	{
		return $this->oDriver instanceof \MailSo\Cache\DriverInterface;
	}

	/**
	 * @param string $sCacheIndex
	 */
	public function SetCacheIndex($sCacheIndex) : self
	{
		$this->sCacheIndex = 0 < \strlen($sCacheIndex) ? "\x0".$sCacheIndex : '';

		return $this;
	}

	/**
	 * @param bool $bCache = false
	 */
	public function Verify($bCache = false) : bool
	{
		if ($this->oDriver)
		{
			$sCacheData = \gmdate('Y-m-d-H');
			if ($bCache && $sCacheData === $this->Get('__verify_key__'))
			{
				return true;
			}

			return $this->Set('__verify_key__', $sCacheData);
		}

		return false;
	}
}
