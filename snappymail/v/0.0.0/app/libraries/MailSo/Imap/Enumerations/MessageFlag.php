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
//	const RECENT = '\\Recent'; // IMAP4rev2 deprecated
	const SEEN = '\\Seen';
	const DELETED = '\\Deleted';
	const FLAGGED = '\\Flagged';
	const ANSWERED = '\\Answered';
	const DRAFT = '\\Draft';
}
