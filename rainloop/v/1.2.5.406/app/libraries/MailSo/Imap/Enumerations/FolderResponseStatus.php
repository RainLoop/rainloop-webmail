<?php

namespace MailSo\Imap\Enumerations;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Enumerations
 */
class FolderResponseStatus
{
	const MESSAGES = 'MESSAGES';
	const RECENT = 'RECENT';
	const UNSEEN = 'UNSEEN';
	const UIDNEXT = 'UIDNEXT';
	const UIDVALIDITY = 'UIDVALIDITY';
}
