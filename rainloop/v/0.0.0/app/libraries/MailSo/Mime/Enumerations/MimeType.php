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
class MimeType
{
	const TEXT_PLAIN = 'text/plain';
	const TEXT_HTML = 'text/html';
	
	const MULTIPART_ALTERNATIVE = 'multipart/alternative';
	const MULTIPART_RELATED = 'multipart/related';
	const MULTIPART_MIXED = 'multipart/mixed';
	const MULTIPART_SIGNED = 'multipart/signed';
	
	const MESSAGE_RFC822 = 'message/rfc822';
	const MESSAGE_PARTIAL = 'message/partial';
	const MESSAGE_REPORT = 'message/report';
	
	const APPLICATION_MS_TNEF = 'application/ms-tnef';
	const APPLICATION_PKCS7_MIME = 'application/pkcs7-mime';
	const APPLICATION_PKCS7_SIGNATURE = 'application/pkcs7-signature';
}
