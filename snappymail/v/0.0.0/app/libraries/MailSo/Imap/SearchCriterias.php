<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Mail
 */
class SearchCriterias
{
	/**
		https://datatracker.ietf.org/doc/html/rfc3501#section-6.4.4

		✔ ALL
			All messages in the mailbox; the default initial key for
			ANDing.

		☐ BCC <string>
			Messages that contain the specified string in the envelope
			structure's BCC field.

		✔ BEFORE <date>
			Messages whose internal date (disregarding time and timezone)
			is earlier than the specified date.

		✔ BODY <string>
			Messages that contain the specified string in the body of the
			message.

		✔ CC <string>
			Messages that contain the specified string in the envelope
			structure's CC field.

		✔ FROM <string>
			Messages that contain the specified string in the envelope
			structure's FROM field.

		✔ HEADER <field-name> <string>
			Messages that have a header with the specified field-name (as
			defined in [RFC-2822]) and that contains the specified string
			in the text of the header (what comes after the colon).  If the
			string to search is zero-length, this matches all messages that
			have a header line with the specified field-name regardless of
			the contents.

		☐ KEYWORD <flag>
			Messages with the specified keyword flag set.

		✔ LARGER <n>
			Messages with an [RFC-2822] size larger than the specified
			number of octets.

		☐ NOT <search-key>
			Messages that do not match the specified search key.

		☐ ON <date>
			Messages whose internal date (disregarding time and timezone)
			is within the specified date.

		✔ OR <search-key1> <search-key2>
			Messages that match either search key.

		☐ SENTBEFORE <date>
			Messages whose [RFC-2822] Date: header (disregarding time and
			timezone) is earlier than the specified date.

		☐ SENTON <date>
			Messages whose [RFC-2822] Date: header (disregarding time and
			timezone) is within the specified date.

		☐ SENTSINCE <date>
			Messages whose [RFC-2822] Date: header (disregarding time and
			timezone) is within or later than the specified date.

		✔ SINCE <date>
			Messages whose internal date (disregarding time and timezone)
			is within or later than the specified date.

		✔ SMALLER <n>
			Messages with an [RFC-2822] size smaller than the specified
			number of octets.

		✔ SUBJECT <string>
			Messages that contain the specified string in the envelope
			structure's SUBJECT field.

		✔ TEXT <string>
			Messages that contain the specified string in the header or
			body of the message.

		✔ TO <string>
			Messages that contain the specified string in the envelope
			structure's TO field.

		☐ UID <sequence set>
			Messages with unique identifiers corresponding to the specified
			unique identifier set.  Sequence set ranges are permitted.

		☐ UNKEYWORD <flag>
			Messages that do not have the specified keyword flag set.

		✔ FLAGGED
		✔ UNFLAGGED
		✔ SEEN
		✔ UNSEEN
		☐ ANSWERED
		☐ UNANSWERED
		☐ DELETED
		☐ UNDELETED
		☐ DRAFT
		☐ UNDRAFT
		X NEW
		X OLD
		X RECENT
	*/

	public static function fromString(\MailSo\Imap\ImapClient $oImapClient, string $sFolderName, string $sSearch, int $iTimeZoneOffset = 0, bool &$bUseCache = true) : string
	{
		$bUseCache = true;
		$iTimeFilter = 0;
		$aCriteriasResult = array();

		if (0 < \MailSo\Config::$MessageListDateFilter) {
			$iD = \time() - 3600 * 24 * 30 * \MailSo\Config::$MessageListDateFilter;
			$iTimeFilter = \gmmktime(1, 1, 1, \gmdate('n', $iD), 1, \gmdate('Y', $iD));
		}

		if (\strlen(\trim($sSearch))) {
			$aLines = static::parseQueryString($sSearch);
//			$aLines = static::parseSearchString($sSearch);

			if (!$aLines) {
				$sValue = static::escapeSearchString($oImapClient, $sSearch);

				if (\MailSo\Config::$MessageListFastSimpleSearch) {
					$aCriteriasResult[] = 'OR OR OR';
					$aCriteriasResult[] = 'FROM';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'TO';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'CC';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'SUBJECT';
					$aCriteriasResult[] = $sValue;
				} else {
					$aCriteriasResult[] = 'TEXT';
					$aCriteriasResult[] = $sValue;
				}
			} else {
				if (isset($aLines['IN']) && $oImapClient->IsSupported('MULTISEARCH') && \in_array($aLines['IN'], ['subtree','subtree-one','mailboxes'])) {
					$aCriteriasResult[] = "IN ({$aLines['IN']} \"{$sFolderName}\")";
				}

				if (isset($aLines['EMAIL'])) {
					$sValue = static::escapeSearchString($oImapClient, $aLines['EMAIL']);

					$aCriteriasResult[] = 'OR OR';
					$aCriteriasResult[] = 'FROM';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'TO';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'CC';
					$aCriteriasResult[] = $sValue;

					unset($aLines['EMAIL']);
				}

				if (isset($aLines['TO'])) {
					$sValue = static::escapeSearchString($oImapClient, $aLines['TO']);

					$aCriteriasResult[] = 'OR';
					$aCriteriasResult[] = 'TO';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'CC';
					$aCriteriasResult[] = $sValue;

					unset($aLines['TO']);
				}

				foreach ($aLines as $sName => $sRawValue) {
					if ('' === \trim($sRawValue)) {
						continue;
					}

					$sValue = static::escapeSearchString($oImapClient, $sRawValue);
					switch ($sName) {
						case 'FROM':
						case 'SUBJECT':
							$aCriteriasResult[] = $sName;
							$aCriteriasResult[] = $sValue;
							break;

						case 'BODY':
//							$sMainText = \trim(\MailSo\Base\Utils::StripSpaces($sMainText), '"');
							$aCriteriasResult[] = 'BODY';
							$aCriteriasResult[] = static::escapeSearchString($oImapClient, $sRawValue);
							break;

						case 'HAS':
							$aValue = \explode(',', \strtolower($sRawValue));
							$aValue = \array_map('trim', $aValue);
							$aCompareArray = array('file', 'files', 'attachment', 'attachments');
							if (\count($aCompareArray) > \count(\array_diff($aCompareArray, $aValue))) {
								// Simple, is not detailed search (Sometimes doesn't work)
								$aCriteriasResult[] = 'OR OR OR';
								$aCriteriasResult[] = 'HEADER Content-Type application/';
								$aCriteriasResult[] = 'HEADER Content-Type multipart/m';
								$aCriteriasResult[] = 'HEADER Content-Type multipart/signed';
								$aCriteriasResult[] = 'HEADER Content-Type multipart/report';
							}

						case 'IS':
							$aValue = \explode(',', \strtolower($sRawValue));
							if (\in_array('flagged', $aValue)) {
								$aCriteriasResult[] = 'FLAGGED';
								$bUseCache = false;
							} else if (\in_array('unflagged', $aValue)) {
								$aCriteriasResult[] = 'UNFLAGGED';
								$bUseCache = false;
							}
							if (\in_array('seen', $aValue)) {
								$aCriteriasResult[] = 'SEEN';
								$bUseCache = false;
							} else if (\in_array('unseen', $aValue)) {
								$aCriteriasResult[] = 'UNSEEN';
								$bUseCache = false;
							}
							break;

						case 'LARGER':
						case 'SMALLER':
							$aCriteriasResult[] = $sName;
							$aCriteriasResult[] =  static::parseFriendlySize($sRawValue);
							break;

						case 'DATE':
							$iDateStampFrom = $iDateStampTo = 0;
							$sDate = $sRawValue;
							$aDate = \explode('/', $sDate);
							if (2 === \count($aDate)) {
								if (\strlen($aDate[0])) {
									$iDateStampFrom = static::parseSearchDate($aDate[0], $iTimeZoneOffset);
								}

								if (\strlen($aDate[1])) {
									$iDateStampTo = static::parseSearchDate($aDate[1], $iTimeZoneOffset);
									$iDateStampTo += 60 * 60 * 24;
								}
							} else {
								if (\strlen($sDate)) {
									$iDateStampFrom = static::parseSearchDate($sDate, $iTimeZoneOffset);
									$iDateStampTo = $iDateStampFrom + 60 * 60 * 24;
								}
							}

							if (0 < $iDateStampFrom) {
								$aCriteriasResult[] = 'SINCE';
								$aCriteriasResult[] = \gmdate('j-M-Y', $iTimeFilter > $iDateStampFrom ?
									$iTimeFilter : $iDateStampFrom);

								$iTimeFilter = 0;
							}

							if (0 < $iDateStampTo) {
								$aCriteriasResult[] = 'BEFORE';
								$aCriteriasResult[] = \gmdate('j-M-Y', $iDateStampTo);
							}
							break;
					}
				}
			}
		}

		$sCriteriasResult = \trim(\implode(' ', $aCriteriasResult));

		if (0 < $iTimeFilter) {
			$sCriteriasResult .= ' SINCE '.\gmdate('j-M-Y', $iTimeFilter);
		}

		$sCriteriasResult = \trim($sCriteriasResult);
		if (\MailSo\Config::$MessageListUndeletedOnly) {
			$sCriteriasResult = \trim($sCriteriasResult.' UNDELETED');
		}

		$sCriteriasResult = \trim($sCriteriasResult);
		if (\MailSo\Config::$MessageListPermanentFilter) {
			$sCriteriasResult = \trim($sCriteriasResult.' '.\MailSo\Config::$MessageListPermanentFilter);
		}

		$sCriteriasResult = \trim($sCriteriasResult);

		return $sCriteriasResult ?: 'ALL';
	}

	private static function escapeSearchString(\MailSo\Imap\ImapClient $oImapClient, string $sSearch) : string
	{
		return !\MailSo\Base\Utils::IsAscii($sSearch)
			? '{'.\strlen($sSearch).'}'."\r\n".$sSearch : $oImapClient->EscapeString($sSearch);
	}

	private static function parseSearchDate(string $sDate, int $iTimeZoneOffset) : int
	{
		if (\strlen($sDate)) {
			$oDateTime = \DateTime::createFromFormat('Y.m.d', $sDate, \MailSo\Base\DateTimeHelper::GetUtcTimeZoneObject());
			return $oDateTime ? $oDateTime->getTimestamp() - $iTimeZoneOffset : 0;
		}
		return 0;
	}

	private static function parseFriendlySize(string $sSize) : int
	{
		$sSize = \preg_replace('/[^0-9KM]/', '', \strtoupper($sSize));
		$iResult = \intval($sSize);
		switch (\substr($sSize, -1)) {
			case 'K':
				$iResult *= 1024;
			case 'M':
				$iResult *= 1024;
		}
		return $iResult;
	}

	/**
	 * SnappyMail search like: 'from=foo&to=test&is[]=unseen&is[]=flagged'
	 */
	private static function parseQueryString(string $sSearch) : array
	{
		$aResult = array();
		$aParams = array();
		\parse_str($sSearch, $aParams);
		foreach ($aParams as $sName => $mValue) {
			if (\is_array($mValue)) {
				$mValue = \implode(',', $mValue);
			}
			if (\strlen($mValue)) {
				$sName = \strtoupper($sName);
				if ('MAIL' === $sName) {
					$sName = 'EMAIL';
				} else if ('TEXT' === $sName) {
					$sName = 'BODY';
				} else if ('SIZE' === $sName || 'BIGGER' === $sName || 'MINSIZE' === $sName) {
					$sName = 'LARGER';
				} else if ('MAXSIZE' === $sName) {
					$sName = 'SMALLER';
				}
				switch ($sName) {
					case 'BODY':
					case 'EMAIL':
					case 'FROM':
					case 'TO':
					case 'SUBJECT':
					case 'IS':
					case 'IN':
					case 'HAS':
					case 'SMALLER':
					case 'LARGER':
					case 'DATE':
						$aResult[$sName] = $mValue;
						break;
				}
			}
		}
		return $aResult;
	}

	/**
	 * RainLoop search like: 'from:"foo" to:"test" is:unseen,flagged'
	 */
	private static function parseSearchString(string $sSearch) : array
	{
		$aResult = array();

		$aCache = array();

		$sReg = 'in|e?mail|from|to|subject|has|is|date|text|body|size|larger|bigger|smaller|maxsize|minsize';

		$sSearch = \MailSo\Base\Utils::StripSpaces($sSearch);
		$sSearch = \trim(\preg_replace('/('.$sReg.'): /i', '\\1:', $sSearch));

		$mMatch = array();
		if (\preg_match_all('/".*?(?<!\\\)"/', $sSearch, $mMatch)) {
			foreach ($mMatch[0] as $sItem) {
				do {
					$sKey = \MailSo\Base\Utils::Sha1Rand();
				}
				while (isset($aCache[$sKey]));

				$aCache[$sKey] = \stripcslashes($sItem);
				$sSearch = \str_replace($sItem, $sKey, $sSearch);
			}
		}

		if (\preg_match_all('/\'.*?(?<!\\\)\'/', $sSearch, $mMatch)) {
			foreach ($mMatch[0] as $sItem) {
				do {
					$sKey = \MailSo\Base\Utils::Sha1Rand();
				}
				while (isset($aCache[$sKey]));

				$aCache[$sKey] = \stripcslashes($sItem);
				$sSearch = \str_replace($sItem, $sKey, $sSearch);
			}
		}

		if (\preg_match_all('/('.$sReg.'):([^\s]*)/i', $sSearch, $mMatch)) {
			if (\is_array($mMatch[0])) {
				foreach ($mMatch[0] as $sToken) {
					$sSearch = \str_replace($sToken, '', $sSearch);
				}

				$sSearch = \MailSo\Base\Utils::StripSpaces($sSearch);
			}

			foreach ($mMatch[1] as $iIndex => $sName) {
				if (isset($mMatch[2][$iIndex]) && \strlen($mMatch[2][$iIndex])) {
					$sName = \strtoupper($sName);
					if ('MAIL' === $sName) {
						$sName = 'EMAIL';
					} else if ('TEXT' === $sName) {
						$sName = 'BODY';
					} else if ('SIZE' === $sName || 'BIGGER' === $sName || 'MINSIZE' === $sName) {
						$sName = 'LARGER';
					} else if ('MAXSIZE' === $sName) {
						$sName = 'SMALLER';
					}
					$aResult[$sName] = $mMatch[2][$iIndex];
				}
			}
		}

		foreach ($aResult as $sName => $sValue) {
			if (isset($aCache[$sValue])) {
				$aResult[$sName] = \trim($aCache[$sValue], '"\' ');
			}
		}

		return $aResult;
	}
}
