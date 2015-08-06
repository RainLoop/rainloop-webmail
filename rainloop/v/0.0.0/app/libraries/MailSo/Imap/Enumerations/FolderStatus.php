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
class FolderStatus
{
	const MESSAGES = 'MESSAGES';
	const RECENT = 'RECENT';
	const UNSEEN = 'UNSEEN';
	const UIDNEXT = 'UIDNEXT';
	const HIGHESTMODSEQ = 'HIGHESTMODSEQ';
	const UIDVALIDITY = 'UIDVALIDITY';
}
