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
	const DATE = 'Date';
	const RECEIVED = 'Received';

	const SUBJECT = 'Subject';

	const TO_ = 'To';
	const FROM_ = 'From';
	const CC = 'Cc';
	const BCC = 'Bcc';
	const REPLY_TO = 'Reply-To';
	const SENDER = 'Sender';
	const RETURN_PATH = 'Return-Path';
	const DELIVERED_TO = 'Delivered-To';

	const MESSAGE_ID = 'Message-ID';
	const IN_REPLY_TO = 'In-Reply-To';
	const REFERENCES = 'References';
	const X_DRAFT_INFO = 'X-Draft-Info';
	const X_ORIGINATING_IP = 'X-Originating-IP';

	const CONTENT_TYPE = 'Content-Type';
	const CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding';
	const CONTENT_DISPOSITION = 'Content-Disposition';
	const CONTENT_DESCRIPTION = 'Content-Description';
	const CONTENT_ID = 'Content-ID';
	const CONTENT_LOCATION = 'Content-Location';

	const SENSITIVITY = 'Sensitivity';

	const RECEIVED_SPF = 'Received-SPF';
	const AUTHENTICATION_RESULTS = 'Authentication-Results';
	const X_DKIM_AUTHENTICATION_RESULTS = 'X-DKIM-Authentication-Results';

	const DKIM_SIGNATURE = 'DKIM-Signature';
	const DOMAINKEY_SIGNATURE = 'DomainKey-Signature';

	// SpamAssassin
	const X_SPAM_FLAG     = 'X-Spam-Flag';     // YES/NO
	const X_SPAM_LEVEL    = 'X-Spam-Level';    // *******
	const X_SPAM_STATUS   = 'X-Spam-Status';   // Yes|No
	// Rspamd
	const X_SPAMD_RESULT  = 'X-Spamd-Result';  // default: False [7.13 / 9.00];
	const X_SPAMD_BAR     = 'X-Spamd-Bar';     // +++++++
	// Bogofilter
	const X_BOGOSITY      = 'X-Bogosity';
	// Unknown
	const X_SPAM_CATEGORY = 'X-Spam-Category'; // SPAM|LEGIT
	const X_SPAM_SCORE    = 'X-Spam-Score';    // 0
	const X_HAM_REPORT    = 'X-Ham-Report';
	const X_MICROSOFT_ANTISPAM = 'x-microsoft-antispam:';

	const X_VIRUS = 'X-Virus';

	const RETURN_RECEIPT_TO = 'Return-Receipt-To';
	const DISPOSITION_NOTIFICATION_TO = 'Disposition-Notification-To';
	const X_CONFIRM_READING_TO = 'X-Confirm-Reading-To';

	const MIME_VERSION = 'MIME-Version';
	const X_MAILER = 'X-Mailer';

	const X_MSMAIL_PRIORITY = 'X-MSMail-Priority';
	const IMPORTANCE = 'Importance';
	const X_PRIORITY = 'X-Priority';

	const LIST_UNSUBSCRIBE = 'List-Unsubscribe';
}
