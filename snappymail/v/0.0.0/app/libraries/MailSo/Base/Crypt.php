<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class Crypt
{

	public static function Encrypt(string $sString, string $sKey) : string
	{
		if (!\strlen($sString)) {
			return '';
		}
		if (\is_callable('xxtea_encrypt')) {
			return \xxtea_encrypt($sString, $sKey);
		}
		return Xxtea::encrypt($sString, $sKey);
	}

	public static function Decrypt(string $sString, string $sKey) : string
	{
		if (!\strlen($sString)) {
			return '';
		}
		if (\is_callable('xxtea_decrypt')) {
			return \xxtea_decrypt($sString, $sKey);
		}
		return Xxtea::decrypt($sString, $sKey);
	}

}
