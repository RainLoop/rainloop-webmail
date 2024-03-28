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
 *
 * https://datatracker.ietf.org/doc/html/rfc3501#section-6.4.5
 */
abstract class FetchType
{
	// Macro equivalent to: (FLAGS INTERNALDATE RFC822.SIZE)
	const FAST = 'FAST';
	// Macro equivalent to: (FLAGS INTERNALDATE RFC822.SIZE ENVELOPE)
	const ALL = 'ALL';
	// Macro equivalent to: (FLAGS INTERNALDATE RFC822.SIZE ENVELOPE BODY)
	const FULL = 'FULL';

	const HEADER = 'HEADER'; // ([RFC-2822] header of the message)
	const TEXT   = 'TEXT';   // ([RFC-2822] text body of the message)
	const MIME   = 'MIME';   // ([MIME-IMB] header)

	// Non-extensible form of BODYSTRUCTURE
	const BODY = 'BODY';
	// An alternate form of BODY[<section>] that does not implicitly set the \Seen flag.
	const BODY_PEEK = 'BODY.PEEK';
	// The text of a particular body section.
	const BODY_HEADER = 'BODY[HEADER]';
	const BODY_HEADER_PEEK = 'BODY.PEEK[HEADER]';
	const BODYSTRUCTURE = 'BODYSTRUCTURE';
	const ENVELOPE = 'ENVELOPE';
	const FLAGS = 'FLAGS';
	const INTERNALDATE = 'INTERNALDATE';
//	const RFC822 = 'RFC822'; // Functionally equivalent to BODY[]
//	const RFC822_HEADER = 'RFC822.HEADER'; // Functionally equivalent to BODY.PEEK[HEADER]
	const RFC822_SIZE = 'RFC822.SIZE';
//	const RFC822_TEXT = 'RFC822.TEXT'; // Functionally equivalent to BODY[TEXT]
	const UID = 'UID';
	// RFC 3516
	const BINARY = 'BINARY';
	const BINARY_PEEK = 'BINARY.PEEK';
	const BINARY_SIZE = 'BINARY.SIZE';
	// RFC 4551
	const MODSEQ = 'MODSEQ';
	// RFC 8474
	const EMAILID = 'EMAILID';
	const THREADID = 'THREADID';
	// RFC 8970
	const PREVIEW = 'PREVIEW';

	public static function BuildBodyCustomHeaderRequest(array $aHeaders, bool $bPeek = true) : string
	{
		if (\count($aHeaders)) {
			$aHeaders = \array_map(fn($sHeader) => \strtoupper(\trim($sHeader)), $aHeaders);
			return ($bPeek ? self::BODY_PEEK : self::BODY)
				. '[HEADER.FIELDS ('.\implode(' ', $aHeaders).')]';
		}
		return '';
	}
}
