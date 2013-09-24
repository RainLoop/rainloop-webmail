<?php

namespace MailSo\Imap\Enumerations;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Enumerations
 */
class MessageFlag
{
	const RECENT = '\Recent';
	const SEEN = '\Seen';
	const DELETED = '\Deleted';
	const FLAGGED = '\Flagged';
	const ANSWERED = '\Answered';
	const DRAFT = '\Draft';
}
