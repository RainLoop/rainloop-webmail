<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * https://datatracker.ietf.org/doc/html/rfc2086
 * https://datatracker.ietf.org/doc/html/rfc4314#section-4
 */

namespace MailSo\Imap\Enumerations;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Enumerations
 */
/**
 * PHP 8.1
enum FolderACL: string {
	case ADMINISTER = 'a';
}
*/
abstract class FolderACL
{
	const
	/** RFC 2086 */
		// perform SETACL/DELETEACL/GETACL/LISTRIGHTS
		ADMINISTER = 'a',
		// mailbox is visible to LIST/LSUB commands, SUBSCRIBE mailbox
		LOOKUP = 'l',
		// SELECT the mailbox, perform STATUS
		READ = 'r',
		// set or clear \SEEN flag via STORE, also set \SEEN during APPEND/COPY/FETCH BODY[...]
		SEEN = 's',
		// set or clear flags other than \SEEN and \DELETED via STORE, also set them during APPEND/COPY
		WRITE = 'w',
		// perform APPEND, COPY into mailbox
		INSERT = 'i',
		// send mail to submission address for mailbox, not enforced by IMAP4 itself
		POST = 'p',
		// CREATE new sub-mailboxes in any implementation-defined hierarchy
//		CREATE_OLD = 'c',
		// STORE DELETED flag, perform EXPUNGE
//		DELETED_OLD = 'd',
	/** RFC 4314 */
		// CREATE new sub-mailboxes in any implementation-defined hierarchy, parent mailbox for the new mailbox name in RENAME
		CREATE = 'k',
		// DELETE mailbox, old mailbox name in RENAME
		DELETE = 'x',
		// set or clear \DELETED flag via STORE, set \DELETED flag during APPEND/COPY
		DELETED = 't',
		// perform EXPUNGE and expunge as a part of CLOSE
		EXPUNGE = 'e';
}
