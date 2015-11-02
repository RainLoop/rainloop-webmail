<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Enumerations;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Enumerations
 */
class FetchType
{
	const ALL = 'ALL';
	const FAST = 'FAST';
	const FULL = 'FULL';
	const BODY = 'BODY';
	const BODY_PEEK = 'BODY.PEEK';
	const BODY_HEADER = 'BODY[HEADER]';
	const BODY_HEADER_PEEK = 'BODY.PEEK[HEADER]';
	const BODYSTRUCTURE = 'BODYSTRUCTURE';
	const ENVELOPE = 'ENVELOPE';
	const FLAGS = 'FLAGS';
	const INTERNALDATE = 'INTERNALDATE';
	const RFC822 = 'RFC822';
	const RFC822_HEADER = 'RFC822.HEADER';
	const RFC822_SIZE = 'RFC822.SIZE';
	const RFC822_TEXT = 'RFC822.TEXT';
	const UID = 'UID';
	const INDEX = 'INDEX';

	const GMAIL_MSGID = 'X-GM-MSGID';
	const GMAIL_THRID = 'X-GM-THRID';
	const GMAIL_LABELS = 'X-GM-LABELS';

	/**
	 * @param array $aReturn
	 *
	 * @param string|array $mType
	 */
	private static function addHelper(&$aReturn, $mType)
	{
		if (\is_string($mType))
		{
			$aReturn[$mType] = '';
		}
		else if (\is_array($mType) && 2 === count($mType) && \is_string($mType[0]) &&
			is_callable($mType[1]))
		{
			$aReturn[$mType[0]] = $mType[1];
		}
	}

	/**
	 * @param array $aHeaders
	 * @param bool $bPeek = true
	 *
	 * @return string
	 */
	public static function BuildBodyCustomHeaderRequest(array $aHeaders, $bPeek = true)
	{
		$sResult = '';
		if (0 < \count($aHeaders))
		{
			$aHeaders = \array_map('trim', $aHeaders);
			$aHeaders = \array_map('strtoupper', $aHeaders);

			$sResult = $bPeek ? self::BODY_PEEK : self::BODY;
			$sResult .= '[HEADER.FIELDS ('.\implode(' ', $aHeaders).')]';
		}

		return $sResult;
	}

	/**
	 * @param array $aFetchItems
	 * 
	 * @return array
	 */
	public static function ChangeFetchItemsBefourRequest(array $aFetchItems)
	{
		$aReturn = array();
		self::addHelper($aReturn, self::UID);
		self::addHelper($aReturn, self::RFC822_SIZE);

		foreach ($aFetchItems as $mFetchKey)
		{
			switch ($mFetchKey)
			{
				default:
					if (is_string($mFetchKey) || is_array($mFetchKey))
					{
						self::addHelper($aReturn, $mFetchKey);
					}
					break;
				case self::INDEX:
				case self::UID:
				case self::RFC822_SIZE:
					break;
				case self::ALL:
					self::addHelper($aReturn, self::FLAGS);
					self::addHelper($aReturn, self::INTERNALDATE);
					self::addHelper($aReturn, self::ENVELOPE);
					break;
				case self::FAST:
					self::addHelper($aReturn, self::FLAGS);
					self::addHelper($aReturn, self::INTERNALDATE);
					break;
				case self::FULL:
					self::addHelper($aReturn, self::FLAGS);
					self::addHelper($aReturn, self::INTERNALDATE);
					self::addHelper($aReturn, self::ENVELOPE);
					self::addHelper($aReturn, self::BODY);
					break;
			}
		}

		return $aReturn;
	}
}
