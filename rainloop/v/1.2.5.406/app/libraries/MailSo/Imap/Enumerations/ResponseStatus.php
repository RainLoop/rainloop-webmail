<?php

namespace MailSo\Imap\Enumerations;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Enumerations
 */
class ResponseStatus
{
	const OK = 'OK';
	const NO = 'NO';
	const BAD = 'BAD';
	const BYE = 'BYE';
	const PREAUTH = 'PREAUTH';
}
