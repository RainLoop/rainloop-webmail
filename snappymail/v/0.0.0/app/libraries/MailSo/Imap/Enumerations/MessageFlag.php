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
abstract class MessageFlag
{
	const
//		RECENT = '\\Recent', // IMAP4rev2 deprecated
		SEEN = '\\Seen',
		DELETED = '\\Deleted',
		FLAGGED = '\\Flagged',
		ANSWERED = '\\Answered',
		DRAFT = '\\Draft',
		// https://datatracker.ietf.org/doc/html/rfc9051#section-2.3.2
		FORWARDED = '$Forwarded',
		MDNSENT = '$MDNSent',
		JUNK = '$Junk',
		NOTJUNK = '$NotJunk',
		PHISHING = '$Phishing';
}
