<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime\Enumerations;

/**
 * @category MailSo
 * @package Mime
 * @subpackage Enumerations
 */
abstract class Header
{
	const
		DATE = 'Date',
		RECEIVED = 'Received',

		SUBJECT = 'Subject',

		TO_ = 'To',
		FROM_ = 'From',
		CC = 'Cc',
		BCC = 'Bcc',
		REPLY_TO = 'Reply-To',
		SENDER = 'Sender',
		RETURN_PATH = 'Return-Path',
		DELIVERED_TO = 'Delivered-To',

		MESSAGE_ID = 'Message-ID',
		IN_REPLY_TO = 'In-Reply-To',
		REFERENCES = 'References',
		X_DRAFT_INFO = 'X-Draft-Info',
		X_ORIGINATING_IP = 'X-Originating-IP',

		CONTENT_TYPE = 'Content-Type',
		CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding',
		CONTENT_DISPOSITION = 'Content-Disposition',
		CONTENT_DESCRIPTION = 'Content-Description',
		CONTENT_ID = 'Content-ID',
//		CONTENT_BASE = 'Content-Base', // rfc2110
		CONTENT_LOCATION = 'Content-Location',

		RECEIVED_SPF = 'Received-SPF',
		AUTHENTICATION_RESULTS = 'Authentication-Results',
		X_DKIM_AUTHENTICATION_RESULTS = 'X-DKIM-Authentication-Results',

		DKIM_SIGNATURE = 'DKIM-Signature',
		DOMAINKEY_SIGNATURE = 'DomainKey-Signature',

	// SpamAssassin
		X_SPAM_FLAG     = 'X-Spam-Flag',     // YES/NO
		X_SPAM_LEVEL    = 'X-Spam-Level',    // *******
		X_SPAM_STATUS   = 'X-Spam-Status',   // Yes|No
		X_SPAM_BAR      = 'X-Spam-Bar',      // ++ | --
		X_SPAM_REPORT   = 'X-Spam-Report',
		X_SPAM_INFO     = 'X-Spam-Info',     // v4.0.0
	// Rspamd
		X_SPAMD_RESULT  = 'X-Spamd-Result',  // default: False [7.13 / 9.00],
		X_SPAMD_BAR     = 'X-Spamd-Bar',     // +++++++
	// Bogofilter
		X_BOGOSITY      = 'X-Bogosity',
	// Unknown
		X_SPAM_CATEGORY = 'X-Spam-Category', // SPAM|LEGIT
		X_SPAM_SCORE    = 'X-Spam-Score',    // 0
		X_HAM_REPORT    = 'X-Ham-Report',
		X_MICROSOFT_ANTISPAM = 'x-microsoft-antispam',

//	 	X_QUARANTINE_ID = 'X-Quarantine-ID',
	// Rspamd
		X_VIRUS = 'X-Virus',
	// ClamAV
		X_VIRUS_SCANNED = 'X-Virus-Scanned',
		X_VIRUS_STATUS  = 'X-Virus-Status',  // clean/infected/not-scanned

		RETURN_RECEIPT_TO = 'Return-Receipt-To',
		DISPOSITION_NOTIFICATION_TO = 'Disposition-Notification-To',
		X_CONFIRM_READING_TO = 'X-Confirm-Reading-To',

		MIME_VERSION = 'MIME-Version',
		X_MAILER = 'X-Mailer',

		X_MSMAIL_PRIORITY = 'X-MSMail-Priority',
		IMPORTANCE = 'Importance',
		X_PRIORITY = 'X-Priority',

		// https://autocrypt.org/level1.html#the-autocrypt-header
		AUTOCRYPT = 'Autocrypt',
		// Deprecated https://datatracker.ietf.org/doc/html/draft-josefsson-openpgp-mailnews-header-07
//		X_PGP_KEY = 'X-PGP-Key',
//		OPENPGP = 'OpenPGP', // url="https://www.irf.se/pgp/robert.labudda" id=11FA93ABE6892CA7D58CB0BE6392A597DE44B055

		// https://www.ietf.org/archive/id/draft-brand-indicators-for-message-identification-04.html#bimi-selector
		BIMI_SELECTOR = 'BIMI-Selector',

		LIST_UNSUBSCRIBE = 'List-Unsubscribe';
}
