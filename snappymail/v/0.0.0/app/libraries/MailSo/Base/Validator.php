<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class Validator
{
	public static function RangeInt(int $iNumber, int $iMin = null, int $iMax = null) : bool
	{
		return (null === $iMin || $iNumber >= $iMin) && (null === $iMax || $iNumber <= $iMax);
	}
}
