<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2021 DJMaze
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
abstract class MetadataKeys
{
	const
		// RFC 5464
		ADMIN_SHARED   = '/shared/admin', // Server
		COMMENT        = '/private/comment', // Mailbox
		COMMENT_SHARED = '/shared/comment', // Server & Mailbox

		// RFC 6154
		SPECIALUSE = '/private/specialuse',

		// Kolab
		KOLAB_CTYPE        = '/private/vendor/kolab/folder-type',
		KOLAB_CTYPE_SHARED = '/shared/vendor/kolab/folder-type',
		KOLAB_COLOR        = '/private/vendor/kolab/color',
		KOLAB_COLOR_SHARED = '/shared/vendor/kolab/color',
		KOLAB_NAME         = '/private/vendor/kolab/displayname',
		KOLAB_NAME_SHARED  = '/shared/vendor/kolab/displayname',
		KOLAB_UID_SHARED   = '/shared/vendor/kolab/uniqueid',
		CYRUS_UID_SHARED   = '/shared/vendor/cmu/cyrus-imapd/uniqueid';
}
