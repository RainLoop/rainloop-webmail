<?php

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class DateTimeHelper
{
	/**
	 * @access private
	 */
	private function __construct()
	{
	}

	/**
	 * @staticvar \DateTimeZone $oDateTimeZone
	 *
	 * @return \DateTimeZone
	 */
	public static function GetUtcTimeZoneObject()
	{
		static $oDateTimeZone = null;
		if (null === $oDateTimeZone)
		{
			$oDateTimeZone = new \DateTimeZone('UTC');
		}
		return $oDateTimeZone;
	}

	/**
	 * Parse date string formated as "Thu, 10 Jun 2010 08:58:33 -0700 (PDT)"
	 * RFC2822
	 *
	 * @param string $sDateTime
	 *
	 * @return int
	 */
	public static function ParseRFC2822DateString($sDateTime)
	{
		$sDateTime = \trim(\preg_replace('/ \([a-zA-Z0-9]+\)$/', '', \trim($sDateTime)));
		$oDateTime = \DateTime::createFromFormat('D, d M Y H:i:s O', $sDateTime, \MailSo\Base\DateTimeHelper::GetUtcTimeZoneObject());
		return $oDateTime ? $oDateTime->getTimestamp() : 0;
	}

	/**
	 * Parse date string formated as "10-Jan-2012 01:58:17 -0800"
	 * IMAP INTERNALDATE Format
	 *
	 * @param string $sDateTime
	 *
	 * @return int
	 */
	public static function ParseInternalDateString($sDateTime)
	{
		$oDateTime = \DateTime::createFromFormat('d-M-Y H:i:s O', \trim($sDateTime), \MailSo\Base\DateTimeHelper::GetUtcTimeZoneObject());
		return $oDateTime ? $oDateTime->getTimestamp() : 0;
	}

	/**
	 * Parse date string formated as "2011-06-14 23:59:59 +0400"
	 *
	 * @param string $sDateTime
	 *
	 * @return int
	 */
	public static function ParseDateStringType1($sDateTime)
	{
		$oDateTime = \DateTime::createFromFormat('Y-m-d H:i:s O', \trim($sDateTime), \MailSo\Base\DateTimeHelper::GetUtcTimeZoneObject());
		return $oDateTime ? $oDateTime->getTimestamp() : 0;
	}
}
