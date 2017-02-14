<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo;

/**
 * @category MailSo
 */
final class Version
{
	/**
	 * @var string
	 */
	const APP_VERSION = '2.0.1';

	/**
	 * @var string
	 */
	const MIME_X_MAILER = 'MailSo';

	/**
	 * @return string
	 */
	public static function AppVersion()
	{
		return \MailSo\Version::APP_VERSION;
	}

	/**
	 * @return string
	 */
	public static function XMailer()
	{
		return \MailSo\Version::MIME_X_MAILER.'/'.\MailSo\Version::APP_VERSION;
	}

	/**
	 * @return string
	 */
	public static function Signature()
	{
		$sSignature = '';
		if (\defined('MAILSO_LIBRARY_USE_PHAR'))
		{
			$oPhar = new \Phar('mailso.phar');
			$sSignature = $oPhar->getSignature();
		}

		return $sSignature;
	}
}
