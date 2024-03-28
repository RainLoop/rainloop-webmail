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
		INFO = \LOG_INFO,       // 6
		NOTICE = \LOG_NOTICE,   // 5
		WARNING = \LOG_WARNING, // 4
		ERROR = \LOG_ERR,       // 3
		SECURE = \LOG_INFO,
		NOTE = \LOG_INFO,
		TIME = \LOG_DEBUG,
		MEMORY = \LOG_INFO,
		TIME_DELTA = \LOG_INFO,
		DEBUG = \LOG_DEBUG;     // 7
}
