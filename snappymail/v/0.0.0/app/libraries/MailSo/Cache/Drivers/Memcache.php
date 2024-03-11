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
class Memcache implements \MailSo\Cache\DriverInterface
{
	private int $iExpire;

	/**
	 * @var \Memcache|\Memcached|null
	 */
	private $oMem;

	private string $sKeyPrefix;

	function __construct(string $sHost = '127.0.0.1', int $iPort = 11211, int $iExpire = 43200, string $sKeyPrefix = '')
	{
		$this->iExpire = 0 < $iExpire ? $iExpire : 43200;

		$this->oMem = \class_exists('Memcache',false) ? new \Memcache : new \Memcached;
		if (!$this->oMem->addServer($sHost, \strpos($sHost, ':/') ? 0 : $iPort)) {
			$this->oMem = null;
		}

		$this->sKeyPrefix = empty($sKeyPrefix)
			? $sKeyPrefix
			: \preg_replace('/[^a-zA-Z0-9_]/', '_', \rtrim(\trim($this->sKeyPrefix), '\\/')) . '/';
	}

	public function Set(string $sKey, string $sValue) : bool
	{
		return $this->oMem ? $this->oMem->set($this->generateCachedKey($sKey), $sValue, 0, $this->iExpire) : false;
	}

	public function Exists(string $sKey) : bool
	{
		return $this->oMem && false !== $this->oMem->get($this->generateCachedKey($sKey));
	}

	public function Get(string $sKey) : ?string
	{
		$sValue = $this->oMem ? $this->oMem->get($this->generateCachedKey($sKey)) : null;
		return \is_string($sValue) ? $sValue : null;
	}

	public function Delete(string $sKey) : void
	{
		$this->oMem && $this->oMem->delete($this->generateCachedKey($sKey));
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 === $iTimeToClearInHours && $this->oMem) {
			return $this->oMem->flush();
		}
		return false;
	}

	private function generateCachedKey(string $sKey) : string
	{
		return $this->sKeyPrefix.\sha1($sKey);
	}
}
