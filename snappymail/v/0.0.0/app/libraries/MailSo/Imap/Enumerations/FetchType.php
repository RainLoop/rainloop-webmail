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
abstract class FetchType
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
	// RFC 3516
	const BINARY = 'BINARY';
	const BINARY_PEEK = 'BINARY.PEEK';
	const BINARY_SIZE = 'BINARY.SIZE';
	// RFC 4551
	const MODSEQ = 'MODSEQ';

	public static function BuildBodyCustomHeaderRequest(array $aHeaders, bool $bPeek = true) : string
	{
		$sResult = '';
		if (\count($aHeaders))
		{
			$aHeaders = \array_map('strtoupper', \array_map('trim', $aHeaders));

			$sResult = $bPeek ? self::BODY_PEEK : self::BODY;
			$sResult .= '[HEADER.FIELDS ('.\implode(' ', $aHeaders).')]';
		}

		return $sResult;
	}
}
