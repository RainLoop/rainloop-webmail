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
	private int $iExpire;

	/**
	 * @var \Predis\Client|null
	 */
	private $oRedis;

	private string $sKeyPrefix;

	function __construct(string $sHost = '127.0.0.1', int $iPort = 6379, int $iExpire = 43200, string $sKeyPrefix = '')
	{
		$this->iExpire = 0 < $iExpire ? $iExpire : 43200;

		$this->oRedis = null;

		try
		{
			$this->oRedis = new \Predis\Client(\strpos($sHost, ':/') ? $sHost : array(
				'host' => $sHost,
				'port' => $iPort
			));

			$this->oRedis->connect();

			if (!$this->oRedis->isConnected()) {
				$this->oRedis = null;
			}
		}
		catch (\Throwable $oExc)
		{
			$this->oRedis = null;
			unset($oExc);
		}

		$this->sKeyPrefix = empty($sKeyPrefix)
			? $sKeyPrefix
			: \preg_replace('/[^a-zA-Z0-9_]/', '_', rtrim(trim($sKeyPrefix), '\\/')) . '/';
	}

	public function Set(string $sKey, string $sValue) : bool
	{
		if (!$this->oRedis) {
			return false;
		}

		$sValue = $this->oRedis->setex($this->generateCachedKey($sKey), $this->iExpire, $sValue);

		return $sValue === true || $sValue == 'OK';
	}

	public function Exists(string $sKey) : bool
	{
		return $this->oRedis && $this->oRedis->exists($this->generateCachedKey($sKey));
	}

	public function Get(string $sKey) : ?string
	{
		$sValue = $this->oRedis ? $this->oRedis->get($this->generateCachedKey($sKey)) : '';
		return \is_string($sValue) ? $sValue : null;
	}

	public function Delete(string $sKey) : void
	{
		if ($this->oRedis) {
			$this->oRedis->del($this->generateCachedKey($sKey));
		}
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 === $iTimeToClearInHours && $this->oRedis) {
			return $this->oRedis->flushdb();
		}

		return false;
	}

	private function generateCachedKey(string $sKey) : string
	{
		return $this->sKeyPrefix.\sha1($sKey);
	}
}
