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
abstract class FolderResponseStatus
{
	// rfc3501
	const MESSAGES = 'MESSAGES';
//	const RECENT = 'RECENT'; // IMAP4rev2 deprecated
	const UIDNEXT = 'UIDNEXT';
	const UIDVALIDITY = 'UIDVALIDITY';
	const UNSEEN = 'UNSEEN';
	// rfc4551
	const HIGHESTMODSEQ = 'HIGHESTMODSEQ';
}
