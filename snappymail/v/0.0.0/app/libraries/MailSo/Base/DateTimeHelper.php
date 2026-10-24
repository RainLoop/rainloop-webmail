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
abstract class DateTimeHelper
{
	/**
	 * @staticvar \DateTimeZone $oDateTimeZone
	 */
	public static function GetUtcTimeZoneObject() : \DateTimeZone
	{
		static $oDateTimeZone = null;
		if (null === $oDateTimeZone) {
			$oDateTimeZone = new \DateTimeZone('UTC');
		}
		return $oDateTimeZone;
	}

	/**
	 * Parse date string formated as "Thu, 10 Jun 2010 08:58:33 -0700 (PDT)"
	 * https://www.rfc-editor.org/rfc/rfc2822#section-3.3
	 */
	public static function ParseRFC2822DateString(string $sDateTime) : int
	{
		$sDateTime = \trim($sDateTime);
		if (empty($sDateTime)) {
			\SnappyMail\Log::info('', "No RFC 2822 date to parse");
			return 0;
		}

		// Strip invalid data after zone, https://github.com/the-djmaze/snappymail/issues/1554
		$sDateTime = \preg_replace('/\s+\([a-zA-Z0-9]+\)$/', '', $sDateTime);
		// https://github.com/the-djmaze/snappymail/issues/1694#issuecomment-2270983942
		// Strip day-of-week
		$sDateTime = \preg_replace('/^[^,]+,/', '', $sDateTime);
		// Add optional seconds
		$sDateTime = \preg_replace('/ ([0-9]+:[0-9]+) /', ' $1:00 ', $sDateTime);
		$sDateTime = \trim($sDateTime);
		$oDateTime =
			// Using O (difference to Greenwich time (GMT) without colon between hours and minutes)
			\DateTime::createFromFormat('d M Y H:i:s O', $sDateTime, static::GetUtcTimeZoneObject())
			// Using T (obsolete timezone abbreviation)
			?: \DateTime::createFromFormat('d M Y H:i:s T', $sDateTime, static::GetUtcTimeZoneObject());

		try {
			$timestamp = $oDateTime->getTimestamp();

			// 398045302 is 1982-08-13 00:08:22, the date RFC 822 was created
			if (398045302 > $timestamp) {
				\SnappyMail\Log::notice('', "Failed to parse RFC 2822 date '{$sDateTime}'");
				return 0;
			}

			return $timestamp;
		} catch (\Throwable $error) {
			// Catch integer overflow or other fatal errors
			\SnappyMail\Log::notice('', "Failed to parse RFC 2822 date '{$sDateTime}'. {$error->getMessage()}");
			return 0;
		}
	}

	/**
	 * Parse date string formated as "10-Jan-2012 01:58:17 -0800"
	 * IMAP INTERNALDATE Format
	 */
	public static function ParseInternalDateString(string $sDateTime) : int
	{
		$sDateTime = \trim($sDateTime);
		if (empty($sDateTime)) {
			return 0;
		}

		// RFC2822 ~ "Thu, 10 Jun 2010 08:58:33 -0700 (PDT)"
		if (\preg_match('/^[a-z]{2,4}, /i', $sDateTime)) {
			return static::ParseRFC2822DateString($sDateTime);
		}

		$oDateTime = \DateTime::createFromFormat('d-M-Y H:i:s O', $sDateTime, static::GetUtcTimeZoneObject());
		return $oDateTime ? $oDateTime->getTimestamp() : 0;
	}

	/**
	 * Parse date string formated as "2011-06-14 23:59:59 +0400"
	 */
	public static function ParseDateStringType1(string $sDateTime) : int
	{
		$sDateTime = \trim($sDateTime);
		if (empty($sDateTime)) {
			return 0;
		}

		$oDateTime = \DateTime::createFromFormat('Y-m-d H:i:s O', $sDateTime, static::GetUtcTimeZoneObject());
		return $oDateTime ? $oDateTime->getTimestamp() : 0;
	}

	/**
	 * Parse date string formated as "2015-05-08T14:32:18.483-07:00"
	 */
	public static function TryToParseSpecEtagFormat(string $sDateTime) : int
	{
		$oDateTime = \DateTime::createFromFormat(\DateTime::RFC3339_EXTENDED, $sDateTime, static::GetUtcTimeZoneObject());
		if ($oDateTime) {
			return $oDateTime->getTimestamp();
		}

		$sDateTime = \preg_replace('/ \([a-zA-Z0-9]+\)$/', '', \trim($sDateTime));
		$sDateTime = \preg_replace('/(:[\d]{2})\.[\d]{3}/', '$1', \trim($sDateTime));
		$sDateTime = \preg_replace('/(-[\d]{2})T([\d]{2}:)/', '$1 $2', \trim($sDateTime));
		$sDateTime = \preg_replace('/([\-+][\d]{2}):([\d]{2})$/', ' $1$2', \trim($sDateTime));

		return static::ParseDateStringType1($sDateTime);
	}
}
