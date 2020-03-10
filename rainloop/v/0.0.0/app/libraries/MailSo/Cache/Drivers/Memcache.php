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
	/**
	 * @var string
	 */
	private $sHost;

	/**
	 * @var int
	 */
	private $iPost;

	/**
	 * @var int
	 */
	private $iExpire;

	/**
	 * @var \Memcache|null
	 */
	private $oMem;

	/**
	 * @var string
	 */
	private $sKeyPrefix;

	private function __construct(string $sHost = '127.0.0.1', int $iPost = 11211, int $iExpire = 43200, string $sKeyPrefix = '')
	{
		$this->sHost = $sHost;
		$this->iPost = $iPost;
		$this->iExpire = 0 < $iExpire ? $iExpire : 43200;

		$this->oMem = new \Memcache();
		if (!$this->oMem->connect($this->sHost, $this->iPost))
		{
			$this->oMem = null;
		}

		$this->sKeyPrefix = $sKeyPrefix;
		if (!empty($this->sKeyPrefix))
		{
			$this->sKeyPrefix =
				\preg_replace('/[^a-zA-Z0-9_]/', '_', rtrim(trim($this->sKeyPrefix), '\\/')).'/';
		}
	}

	public static function NewInstance(string $sHost = '127.0.0.1', int $iPost = 11211, int $iExpire = 43200, string $sKeyPrefix = '') : self
	{
		return new self($sHost, $iPost, $iExpire, $sKeyPrefix);
	}

	public function Set(string $sKey, string $sValue) : bool
	{
		return $this->oMem ? $this->oMem->set($this->generateCachedKey($sKey), $sValue, 0, $this->iExpire) : false;
	}

	public function Get(string $sKey) : string
	{
		$sValue = $this->oMem ? $this->oMem->get($this->generateCachedKey($sKey)) : '';
		return \is_string($sValue) ? $sValue : '';
	}

	public function Delete(string $sKey) : void
	{
		if ($this->oMem)
		{
			$this->oMem->delete($this->generateCachedKey($sKey));
		}
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 === $iTimeToClearInHours && $this->oMem)
		{
			return $this->oMem->flush();
		}

		return false;
	}

	private function generateCachedKey(string $sKey) : string
	{
		return $this->sKeyPrefix.\sha1($sKey);
	}
}
