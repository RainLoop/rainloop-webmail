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
	const
		RegEx = 'in|e?mail|from|to|subject|has|is|date|since|before|text|body|size|larger|bigger|smaller|maxsize|minsize|keyword|older_than|newer_than|on|senton|sentsince|sentbefore';
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
			in the text of the header (what comes after the colon). If the
			string to search is zero-length, this matches all messages that
			have a header line with the specified field-name regardless of
			the contents.

		✔ KEYWORD <flag>
			Messages with the specified keyword flag set.

		✔ LARGER <n>
			Messages with an [RFC-2822] size larger than the specified
			number of octets.

		☐ NOT <search-key>
			Messages that do not match the specified search key.

		✔ ON <date>
			Messages whose internal date (disregarding time and timezone)
			is within the specified date.

		✔ OR <search-key1> <search-key2>
			Messages that match either search key.

		✔ SENTBEFORE <date>
			Messages whose [RFC-2822] Date: header (disregarding time and
			timezone) is earlier than the specified date.

		✔ SENTON <date>
			Messages whose [RFC-2822] Date: header (disregarding time and
			timezone) is within the specified date.

		✔ SENTSINCE <date>
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
			unique identifier set. Sequence set ranges are permitted.

		☐ UNKEYWORD <flag>
			Messages that do not have the specified keyword flag set.

		✔ FLAGGED
		✔ UNFLAGGED
		✔ SEEN
		✔ UNSEEN
		✔ ANSWERED
		✔ UNANSWERED
		☐ DELETED
		☐ UNDELETED
		☐ DRAFT
		☐ UNDRAFT
		X NEW
		X OLD
		X RECENT
	*/

	private array $criterias = [];
	public bool $fuzzy = false;

	function prepend(string $rule)
	{
		\array_unshift($this->criterias, $rule);
	}

	function __toString() : string
	{
		if ($this->fuzzy) {
			$keys = ['BCC','BODY','CC','FROM','SUBJECT','TEXT','TO'];
			foreach ($this->criterias as $i => $key) {
				if (\in_array($key, $keys)) {
					$this->criterias[$i] = "FUZZY {$key}";
				}
			}
		}
		$sCriteriasResult = \trim(\implode(' ', $this->criterias));
		return $sCriteriasResult ?: 'ALL';
	}

	public static function fromString(\MailSo\Imap\ImapClient $oImapClient, string $sFolderName, string $sSearch, bool $bHideDeleted, bool &$bUseCache = true) : self
	{
		$iTimeFilter = 0;
		$aCriteriasResult = array();

		$sSearch = \trim($sSearch);
		if (\strlen($sSearch)) {
			$aLines = \preg_match('/^('.static::RegEx.'):/i', $sSearch)
				? static::parseSearchString($sSearch)
				: static::parseQueryString($sSearch);

			if (!$aLines) {
				$sValue = static::escapeSearchString($oImapClient, $sSearch);

				if ($oImapClient->Settings->fast_simple_search) {
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
				if (isset($aLines['IN']) && $oImapClient->hasCapability('MULTISEARCH') && \in_array($aLines['IN'], ['subtree','subtree-one','mailboxes'])) {
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
					unset($aLines['FROM']);
					unset($aLines['TO']);
				}

				foreach ($aLines as $sName => $sRawValue) {
					if (\is_string($sRawValue) && '' === \trim($sRawValue)) {
						continue;
					}
					switch ($sName) {
						case 'FROM':
						case 'SUBJECT':
						case 'BODY': // $sValue = \trim(\MailSo\Base\Utils::StripSpaces($sValue), '"');
							$aCriteriasResult[] = $sName;
							$aCriteriasResult[] = static::escapeSearchString($oImapClient, $sRawValue);
							break;
						case 'KEYWORD':
							$aCriteriasResult[] = $sName;
							$aCriteriasResult[] = static::escapeSearchString(
								$oImapClient,
								\MailSo\Base\Utils::Utf8ToUtf7Modified($sRawValue)
							);
							break;

						case 'TO':
							$sValue = static::escapeSearchString($oImapClient, $sRawValue);
							$aCriteriasResult[] = 'OR';
							$aCriteriasResult[] = 'TO';
							$aCriteriasResult[] = $sValue;
							$aCriteriasResult[] = 'CC';
							$aCriteriasResult[] = $sValue;
							break;

						case 'ATTACHMENT':
							// Simple, is not detailed search (Sometimes doesn't work)
							$aCriteriasResult[] = 'OR OR OR';
							$aCriteriasResult[] = 'HEADER Content-Type application/';
							$aCriteriasResult[] = 'HEADER Content-Type multipart/m';
							$aCriteriasResult[] = 'HEADER Content-Type multipart/signed';
							$aCriteriasResult[] = 'HEADER Content-Type multipart/report';
							break;

						case 'FLAGGED':
						case 'UNFLAGGED':
						case 'SEEN':
						case 'UNSEEN':
						case 'ANSWERED':
						case 'UNANSWERED':
						case 'DELETED':
						case 'UNDELETED':
							$aCriteriasResult[] = $sName;
							$bUseCache = false;
							break;

						case 'LARGER':
						case 'SMALLER':
							$aCriteriasResult[] = $sName;
							$aCriteriasResult[] = static::parseFriendlySize($sRawValue);
							break;

						case 'SINCE':
							$sValue = static::parseSearchDate($sRawValue);
							if ($sValue) {
								$iTimeFilter = \max($iTimeFilter, $sValue);
							}
							break;
						case 'ON':
						case 'SENTON':
						case 'SENTSINCE':
						case 'SENTBEFORE':
						case 'BEFORE':
							$sValue = static::parseSearchDate($sRawValue);
							if ($sValue) {
								$aCriteriasResult[] = $sName;
								$aCriteriasResult[] = \gmdate('j-M-Y', $sValue);
							}
							break;

						case 'DATE':
							$iDateStampFrom = $iDateStampTo = 0;
							$aDate = \explode('/', $sRawValue);
							if (2 === \count($aDate)) {
								if (\strlen($aDate[0])) {
									$iDateStampFrom = static::parseSearchDate($aDate[0]);
								}
								if (\strlen($aDate[1])) {
									$iDateStampTo = static::parseSearchDate($aDate[1]);
									$iDateStampTo += 60 * 60 * 24;
								}
							} else if (\strlen($sRawValue)) {
								$iDateStampFrom = static::parseSearchDate($sRawValue);
								$iDateStampTo = $iDateStampFrom + 60 * 60 * 24;
							}

							if (0 < $iDateStampFrom) {
								$iTimeFilter = \max($iTimeFilter, $iDateStampFrom);
							}

							if (0 < $iDateStampTo) {
								$aCriteriasResult[] = 'BEFORE';
								$aCriteriasResult[] = \gmdate('j-M-Y', $iDateStampTo);
							}
							break;

						// https://www.rfc-editor.org/rfc/rfc5032.html
						case 'OLDER':
						case 'YOUNGER':
							// time interval in seconds
							$sValue = \intval($sRawValue);
							if (0 < $sValue && $oImapClient->hasCapability('WITHIN')) {
								$aCriteriasResult[] = $sName;
								$aCriteriasResult[] = $sValue;
							}
							break;

						// https://github.com/the-djmaze/snappymail/issues/625
						case 'READ':
						case 'UNREAD':
							$aCriteriasResult[] = \str_replace('READ', 'SEEN', $sName);
							$bUseCache = false;
							break;
						case 'OLDER_THAN':
							$oDate = (new \DateTime())->sub(new \DateInterval("P{$sRawValue}"));
							if ($oImapClient->hasCapability('WITHIN')) {
								$aCriteriasResult[] = 'OLDER';
								$aCriteriasResult[] = \time() - $oDate->getTimestamp();
							} else {
								$aCriteriasResult[] = 'BEFORE';
								$aCriteriasResult[] = $oDate->format('j-M-Y');
							}
							break;
						case 'NEWER_THAN':
							$oDate = (new \DateTime())->sub(new \DateInterval("P{$sRawValue}"));
							if ($oImapClient->hasCapability('WITHIN')) {
								$aCriteriasResult[] = 'YOUNGER';
								$aCriteriasResult[] = \time() - $oDate->getTimestamp();
							} else {
								$iTimeFilter = \max(
									$iTimeFilter,
									(new \DateTime())->sub(new \DateInterval("P{$sRawValue}"))->getTimestamp()
								);
							}
							break;
					}
				}
			}
		}

		if (0 < $iTimeFilter) {
			$aCriteriasResult[] = 'SINCE';
//			$aCriteriasResult[] = \gmdate('j-M-Y', $iTimeFilter);
			$aCriteriasResult[] = \gmdate('j-M-Y', $iTimeFilter);
		}

		if ($bHideDeleted && !\in_array('DELETED', $aCriteriasResult) && !\in_array('UNDELETED', $aCriteriasResult)) {
			$aCriteriasResult[] = 'UNDELETED';
		}

		if ($oImapClient->Settings->search_filter) {
			$aCriteriasResult[] = $oImapClient->Settings->search_filter;
		}

		$search = new self;
		$search->criterias = $aCriteriasResult;
		return $search;
	}

	public static function escapeSearchString(\MailSo\Imap\ImapClient $oImapClient, string $sSearch) : string
	{
		// https://github.com/the-djmaze/snappymail/issues/836
//		return $oImapClient->EscapeString($sSearch);
//		return \MailSo\Base\Utils::IsAscii($sSearch) || $oImapClient->hasCapability('QQMail'))
		return (\MailSo\Base\Utils::IsAscii($sSearch) || !$oImapClient->hasCapability('LITERAL+'))
			? $oImapClient->EscapeString($sSearch)
			: '{'.\strlen($sSearch).'}'."\r\n{$sSearch}";
	}

	private static function parseSearchDate(string $sDate) : int
	{
		if (\strlen($sDate)) {
			$oDateTime = \DateTime::createFromFormat('Y-m-d', $sDate, \MailSo\Base\DateTimeHelper::GetUtcTimeZoneObject());
			return $oDateTime ? $oDateTime->getTimestamp() : 0;
		}
		return 0;
	}

	private static function parseFriendlySize(string $sSize) : int
	{
		$sSize = \preg_replace('/[^0-9KM]/', '', \strtoupper($sSize));
		$iResult = \intval($sSize);
		switch (\substr($sSize, -1)) {
			case 'M':
				$iResult *= 1024;
			case 'K':
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
				case 'DATE':
					$mValue = \rtrim($mValue,'/') . '/';
				case 'BODY':
				case 'EMAIL':
				case 'FROM':
				case 'TO':
				case 'SUBJECT':
				case 'KEYWORD':
				case 'IN':
				case 'SMALLER':
				case 'LARGER':
				case 'SINCE':
				case 'ON':
				case 'SENTON':
				case 'SENTSINCE':
				case 'SENTBEFORE':
				case 'BEFORE':
				case 'OLDER':
				case 'YOUNGER':
					if (\strlen($mValue)) {
						$aResult[$sName] = $mValue;
					}
					break;

				case 'ATTACHMENT':
				case 'FLAGGED':
				case 'UNFLAGGED':
				case 'SEEN':
				case 'UNSEEN':
				case 'ANSWERED':
				case 'UNANSWERED':
				case 'DELETED':
				case 'UNDELETED':
					$aResult[$sName] = true;
					break;
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

		$sSearch = \MailSo\Base\Utils::StripSpaces($sSearch);
		$sSearch = \trim(\preg_replace('/('.static::RegEx.'):\\s+/i', '\\1:', $sSearch));

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

		if (\preg_match_all('/('.static::RegEx.'):([^\\s]*)/i', $sSearch, $mMatch)) {
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

					if ('HAS' === $sName && \preg_match('/files?|attachments?/', $mMatch[2][$iIndex])) {
						$aResult['ATTACHMENT'] = true;
					} else if ('IS' === $sName) {
						foreach (\explode(',', \strtoupper($mMatch[2][$iIndex])) as $sName) {
							$aResult[\trim($sName)] = true;
						}
					} else if ('DATE' === $sName) {
						$aResult[$sName] = \str_replace('.', '-', $mMatch[2][$iIndex]);
					} else {
						$aResult[$sName] = $mMatch[2][$iIndex];
					}
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
