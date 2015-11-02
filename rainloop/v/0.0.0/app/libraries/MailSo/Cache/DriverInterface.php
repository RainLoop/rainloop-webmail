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
	/**
	 * @param string $sKey
	 * @param string $sValue
	 *
	 * @return bool
	 */
	public function Set($sKey, $sValue);

	/**
	 * @param string $sKey
	 *
	 * @return string
	 */
	public function Get($sKey);

	/**
	 * @param string $sKey
	 *
	 * @return void
	 */
	public function Delete($sKey);

	/**
	 * @param int $iTimeToClearInHours = 24
	 *
	 * @return bool
	 */
	public function GC($iTimeToClearInHours = 24);
}
