<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo;

/**
 * @category MailSo
 */
class Config
{
	/**
	 * @var bool
	 */
	public static $ICONV = true;

	/**
	 * @var bool
	 */
	public static $MBSTRING = true;

	/**
	 * @var bool
	 */
	public static $FixIconvByMbstring = true;

	/**
	 * @var int
	 */
	public static $MessageListFastSimpleSearch = true;

	/**
	 * @var int
	 */
	public static $MessageListCountLimitTrigger = 0;

	/**
	 * @var int
	 */
	public static $MessageListDateFilter = 0;

	/**
	 * @var int
	 */
	public static $LargeThreadLimit = 100;

	/**
	 * @var bool
	 */
	public static $LogSimpleLiterals = false;

	/**
	 * @var bool
	 */
	public static $PreferStartTlsIfAutoDetect = true;

	/**
	 * @var \MailSo\Log\Logger|null
	 */
	public static $SystemLogger = null;
}
