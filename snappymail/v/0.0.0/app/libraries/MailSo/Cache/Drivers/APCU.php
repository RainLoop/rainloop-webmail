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
class APCU implements \MailSo\Cache\DriverInterface
{
	/**
	 * @var string
	 */
	private $sKeyPrefix;

	function __construct(string $sKeyPrefix = '')
	{
		$this->sKeyPrefix = $sKeyPrefix;
		if (!empty($this->sKeyPrefix))
		{
			$this->sKeyPrefix =
				\preg_replace('/[^a-zA-Z0-9_]/', '_', rtrim(trim($this->sKeyPrefix), '\\/')).'/';
		}
	}

	public function Set(string $sKey, string $sValue) : bool
	{
		return \apcu_store($this->generateCachedKey($sKey), (string) $sValue);
	}

	public function Get(string $sKey) : string
	{
		$sValue = \apcu_fetch($this->generateCachedKey($sKey));
		return \is_string($sValue) ? $sValue : '';
	}

	public function Delete(string $sKey) : void
	{
		\apcu_delete($this->generateCachedKey($sKey));
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		if (0 === $iTimeToClearInHours)
		{
			return \apcu_clear_cache('user');
		}

		return false;
	}

	private function generateCachedKey(string $sKey) : string
	{
		return $this->sKeyPrefix.\sha1($sKey);
	}
}
