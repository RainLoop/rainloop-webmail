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
class Redis implements \MailSo\Cache\DriverInterface
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
	private $oRedis;

	/**
	 * @var string
	 */
	private $sKeyPrefix;

	/**
	 * @param string $sHost = '127.0.0.1'
	 * @param int $iPost = 6379
	 * @param int $iExpire = 43200
	 * @param string $sKeyPrefix = ''
	 */
	private function __construct($sHost = '127.0.0.1', $iPost = 6379, $iExpire = 43200, $sKeyPrefix = '')
	{
		$this->sHost = $sHost;
		$this->iPost = $iPost;
		$this->iExpire = 0 < $iExpire ? $iExpire : 43200;

		$this->oRedis = null;

		try
		{
			$this->oRedis = new \Predis\Client('unix:' === substr($sHost, 0, 5) ? $sHost : array(
				'host' => $sHost,
				'port' => $iPost
			));

			$this->oRedis->connect();

			if (!$this->oRedis->isConnected())
			{
				$this->oRedis = null;
			}
		}
		catch (\Exception $oExc)
		{
			$this->oRedis = null;
			unset($oExc);
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
	public static function NewInstance($sHost = '127.0.0.1', $iPost = 6379, $iExpire = 43200, $sKeyPrefix = '')
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
		return $this->oRedis ? $this->oRedis->setex($this->generateCachedKey($sKey), $this->iExpire, $sValue) : false;
	}

	/**
	 * @param string $sKey
	 *
	 * @return string
	 */
	public function Get($sKey)
	{
		$sValue = $this->oRedis ? $this->oRedis->get($this->generateCachedKey($sKey)) : '';
		return \is_string($sValue) ? $sValue : '';
	}

	/**
	 * @param string $sKey
	 *
	 * @return void
	 */
	public function Delete($sKey)
	{
		if ($this->oRedis)
		{
			$this->oRedis->del($this->generateCachedKey($sKey));
		}
	}

	/**
	 * @param int $iTimeToClearInHours = 24
	 *
	 * @return bool
	 */
	public function GC($iTimeToClearInHours = 24)
	{
		if (0 === $iTimeToClearInHours && $this->oRedis)
		{
			return $this->oRedis->flushdb();
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
