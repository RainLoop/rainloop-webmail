<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Log\Enumerations;

/**
 * @category MailSo
 * @package Log
 * @subpackage Enumerations
 */
abstract class Type
{
	const
		INFO = 0,
		NOTICE = 1,
		WARNING = 2,
		ERROR = 3,
		SECURE = 4,
		NOTE = 5,
		TIME = 6,
		MEMORY = 7,
		TIME_DELTA = 8,
		DEBUG = 9,

		NOTICE_PHP = 11,
		WARNING_PHP = 12,
		ERROR_PHP = 13;
}
