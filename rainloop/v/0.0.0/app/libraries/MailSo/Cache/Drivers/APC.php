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
class APC implements \MailSo\Cache\DriverInterface
{
	/**
	 * @var string
	 */
	private $sKeyPrefix;

	private function __construct(string $sKeyPrefix = '')
	{
		$this->sKeyPrefix = $sKeyPrefix;
		if (!empty($this->sKeyPrefix))
		{
			$this->sKeyPrefix =
				\preg_replace('/[^a-zA-Z0-9_]/', '_', rtrim(trim($this->sKeyPrefix), '\\/')).'/';
		}
	}

	public static function NewInstance(string $sKeyPrefix = '') : self
	{
		return new self($sKeyPrefix);
	}

	public function Set(string $sKey, string $sValue) : bool
	{
		return \apc_store($this->generateCachedKey($sKey), (string) $sValue);
	}

	public function Get(string $sKey) : string
	{
		$sValue = \apc_fetch($this->generateCachedKey($sKey));
		return \is_string($sValue) ? $sValue : '';
	}

	public function Delete(string $sKey) : void
	{
		\apc_delete($this->generateCachedKey($sKey));
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 === $iTimeToClearInHours)
		{
			return \apc_clear_cache('user');
		}

		return false;
	}

	private function generateCachedKey(string $sKey) : string
	{
		return $this->sKeyPrefix.\sha1($sKey);
	}
}
