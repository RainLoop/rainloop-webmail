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
	private string $sKeyPrefix;

	public function setPrefix(string $sKeyPrefix) : void
	{
		$sKeyPrefix = \rtrim(\trim($sKeyPrefix), '\\/');
		$this->sKeyPrefix = empty($sKeyPrefix)
			? $sKeyPrefix
			: \preg_replace('/[^a-zA-Z0-9_]/', '_', $sKeyPrefix).'/';
	}

	public function Set(string $sKey, string $sValue) : bool
	{
		return \apcu_store($this->generateCachedKey($sKey), (string) $sValue);
	}

	public function Exists(string $sKey) : bool
	{
		return \apcu_exists($this->generateCachedKey($sKey));
	}

	public function Get(string $sKey) : ?string
	{
		$sValue = \apcu_fetch($this->generateCachedKey($sKey));
		return \is_string($sValue) ? $sValue : null;
	}

	public function Delete(string $sKey) : void
	{
		\apcu_delete($this->generateCachedKey($sKey));
	}

	public function GC(int $iTimeToClearInHours = 24) : bool
	{
		return (0 === $iTimeToClearInHours) ? \apcu_clear_cache('user') : false;
	}

	private function generateCachedKey(string $sKey) : string
	{
		return $this->sKeyPrefix.\sha1($sKey);
	}
}
