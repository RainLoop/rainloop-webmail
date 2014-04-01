<?php

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
	const SPAM = 4;
	const TRASH = 5;
	const IMPORTANT = 10;
	const STARRED = 11;
	const ARCHIVE = 12;
}
