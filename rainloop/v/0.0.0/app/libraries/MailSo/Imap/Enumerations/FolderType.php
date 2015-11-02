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
class FolderType
{
	const USER = 0;
	const INBOX = 1;
	const SENT = 2;
	const DRAFTS = 3;
	const JUNK = 4;
	const TRASH = 5;
	const IMPORTANT = 10;
	const FLAGGED = 11;
	const ALL = 12;
}
