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
abstract class FolderStatus
{
	// RFC 3501
	const MESSAGES = 'MESSAGES';
//	const RECENT = 'RECENT'; // IMAP4rev2 deprecated
	const UIDNEXT = 'UIDNEXT';
	const UIDVALIDITY = 'UIDVALIDITY';
	const UNSEEN = 'UNSEEN';
	// RFC 4551
	const HIGHESTMODSEQ = 'HIGHESTMODSEQ';
	// RFC 7889
	const APPENDLIMIT = 'APPENDLIMIT';
	// RFC 8474
	const MAILBOXID = 'MAILBOXID';
	// RFC 9051 IMAP4rev2
	const SIZE = 'SIZE';
}
