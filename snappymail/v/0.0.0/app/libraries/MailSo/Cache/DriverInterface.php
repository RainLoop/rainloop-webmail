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
interface DriverInterface
{
	public function Set(string $sKey, string $sValue) : bool;

	public function Exists(string $sKey) : bool;

	public function Get(string $sKey) : ?string;

	public function Delete(string $sKey) : void;

	public function GC(int $iTimeToClearInHours = 24) : bool;
}
