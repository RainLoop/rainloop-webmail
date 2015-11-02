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

	/**
	 * @param string $sHost = '127.0.0.1'
	 * @param int $iPost = 11211
	 * @param int $iExpire = 43200
	 * @param string $sKeyPrefix = ''
	 */
	private function __construct($sHost = '127.0.0.1', $iPost = 11211, $iExpire = 43200, $sKeyPrefix = '')
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

	/**
	 * @param string $sHost = '127.0.0.1'
	 * @param int $iPost = 11211
	 * @param int $iExpire = 43200
	 * @param string $sKeyPrefix = ''
	 *
	 * @return \MailSo\Cache\Drivers\APC
	 */
	public static function NewInstance($sHost = '127.0.0.1', $iPost = 11211, $iExpire = 43200, $sKeyPrefix = '')
	{
		return new self($sHost, $iPost, $iExpire, $sKeyPrefix);
	}

	/**
	 * @param string $sKey
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Set($sKey, $sValue)
	{
		return $this->oMem ? $this->oMem->set($this->generateCachedKey($sKey), $sValue, 0, $this->iExpire) : false;
	}

	/**
	 * @param string $sKey
	 *
	 * @return string
	 */
	public function Get($sKey)
	{
		$sValue = $this->oMem ? $this->oMem->get($this->generateCachedKey($sKey)) : '';
		return \is_string($sValue) ? $sValue : '';
	}

	/**
	 * @param string $sKey
	 *
	 * @return void
	 */
	public function Delete($sKey)
	{
		if ($this->oMem)
		{
			$this->oMem->delete($this->generateCachedKey($sKey));
		}
	}

	/**
	 * @param int $iTimeToClearInHours = 24
	 *
	 * @return bool
	 */
	public function GC($iTimeToClearInHours = 24)
	{
		if (0 === $iTimeToClearInHours && $this->oMem)
		{
			return $this->oMem->flush();
		}

		return false;
	}

	/**
	 * @param string $sKey
	 *
	 * @return string
	 */
	private function generateCachedKey($sKey)
	{
		return $this->sKeyPrefix.\sha1($sKey);
	}
}
