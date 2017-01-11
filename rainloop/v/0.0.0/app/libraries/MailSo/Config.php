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
	 * @var array|null
	 */
	public static $HtmlStrictAllowedTags = null;

	/**
	 * @var array|null
	 */
	public static $HtmlStrictAllowedAttributes = null;

	/**
	 * @var boolean
	 */
	public static $HtmlStrictDebug = false;

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
	 * @var bool
	 */
	public static $MessageListUndeletedOnly = true;

	/**
	 * @var int
	 */
	public static $MessageListDateFilter = 0;

	/**
	 * @var string
	 */
	public static $MessageListPermanentFilter = '';

	/**
	 * @var int
	 */
	public static $LargeThreadLimit = 50;

	/**
	 * @var bool
	 */
	public static $MessageAllHeaders = false;

	/**
	 * @var bool
	 */
	public static $LogSimpleLiterals = false;

	/**
	 * @var bool
	 */
	public static $CheckNewMessages = true;

	/**
	 * @var bool
	 */
	public static $PreferStartTlsIfAutoDetect = true;

	/**
	 * @var string
	 */
	public static $BoundaryPrefix = '_Part_';

	/**
	 * @var int
	 */
	public static $ImapTimeout = 300;

	/**
	 * @var \MailSo\Log\Logger|null
	 */
	public static $SystemLogger = null;
}
