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
class Header
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

	const X_SPAM_STATUS = 'X-Spam-Status';

	const RETURN_RECEIPT_TO = 'Return-Receipt-To';
	const DISPOSITION_NOTIFICATION_TO = 'Disposition-Notification-To';
	const X_CONFIRM_READING_TO = 'X-Confirm-Reading-To';

	const MIME_VERSION = 'Mime-Version';
	const X_MAILER = 'X-Mailer';

	const X_MSMAIL_PRIORITY = 'X-MSMail-Priority';
	const IMPORTANCE = 'Importance';
	const X_PRIORITY = 'X-Priority';

	const LIST_UNSUBSCRIBE = 'List-Unsubscribe';
}
