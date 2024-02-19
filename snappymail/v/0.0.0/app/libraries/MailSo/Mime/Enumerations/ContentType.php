<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2024 SnappyMail
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
abstract class ContentType
{
	const SIGNED = 'multipart/signed';
	const ENCRYPTED = 'multipart/encrypted';
	const PGP_ENCRYPTED = 'application/pgp-encrypted';
	const PGP_SIGNATURE = 'application/pgp-signature';
	const PKCS7_SIGNATURE = 'application/pkcs7-signature';
	const PKCS7_MIME = 'application/pkcs7-mime';

	public static function isPkcs7Signature(string $data) : bool
	{
		return 'application/pkcs7-signature' === $data
			|| 'application/x-pkcs7-signature' === $data;
	}
}
