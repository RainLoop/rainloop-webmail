<?php

namespace MailSo\Imap\Enumerations;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Enumerations
 */
class ResponseType
{
	const UNKNOWN = 0;
	const TAGGED = 1;
	const UNTAGGED = 2;
	const CONTINUATION = 3;
}
