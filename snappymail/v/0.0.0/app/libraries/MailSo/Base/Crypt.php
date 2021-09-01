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

	public static function Encrypt(string $sString, string $sKey, string $sCipher = '') : string
	{
		if (!\strlen($sString)) {
			return '';
		}
		if ($sCipher && \is_callable('openssl_encrypt')) {
			$iv = \str_pad('', \openssl_cipher_iv_length($sCipher), \sha1($sKey));
			return \openssl_encrypt($sString, $sCipher, $sKey, OPENSSL_RAW_DATA, $iv);
		}
		if (\is_callable('xxtea_encrypt')) {
			return \xxtea_encrypt($sString, $sKey);
		}
		return Xxtea::encrypt($sString, $sKey);
	}

	public static function Decrypt(string $sString, string $sKey, string $sCipher = '') : string
	{
		if (!\strlen($sString)) {
			return '';
		}
		if ($sCipher && \is_callable('openssl_encrypt')) {
			$iv = \str_pad('', \openssl_cipher_iv_length($sCipher), \sha1($sKey));
			return \openssl_decrypt($sString, $sCipher, $sKey, OPENSSL_RAW_DATA, $iv);
		}
		if (\is_callable('xxtea_decrypt')) {
			return \xxtea_decrypt($sString, $sKey);
		}
		return Xxtea::decrypt($sString, $sKey);
	}

}
