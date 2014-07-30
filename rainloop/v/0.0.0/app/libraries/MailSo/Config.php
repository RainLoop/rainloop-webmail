<?php

namespace MailSo;

/**
 * @category MailSo
 * @package Base
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
	 * @var \MailSo\Log\Logger
	 */
	public static $SystemLogger = null;
}
