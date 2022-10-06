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
abstract class Locale
{
	/**
	 * @var array
	 */
	public static $aLocaleMapping = array(
		'.65001' => 'utf-8',
		'.20127' => 'iso-8859-1',

		'.1250' => 'windows-1250',
		'.cp1250' => 'windows-1250',
		'.cp-1250' => 'windows-1250',
		'.1251' => 'windows-1251',
		'.cp1251' => 'windows-1251',
		'.cp-1251' => 'windows-1251',
		'.1252' => 'windows-1252',
		'.cp1252' => 'windows-1252',
		'.cp-1252' => 'windows-1252',
		'.1253' => 'windows-1253',
		'.cp1253' => 'windows-1253',
		'.cp-1253' => 'windows-1253',
		'.1254' => 'windows-1254',
		'.cp1254' => 'windows-1254',
		'.cp-1254' => 'windows-1254',
		'.1255' => 'windows-1255',
		'.cp1255' => 'windows-1255',
		'.cp-1255' => 'windows-1255',
		'.1256' => 'windows-1256',
		'.cp1256' => 'windows-1256',
		'.cp-1256' => 'windows-1256',
		'.1257' => 'windows-1257',
		'.cp1257' => 'windows-1257',
		'.cp-1257' => 'windows-1257',
		'.1258' => 'windows-1258',
		'.cp1258' => 'windows-1258',
		'.cp-1258' => 'windows-1258',

		'.28591' => 'iso-8859-1',
		'.28592' => 'iso-8859-2',
		'.28593' => 'iso-8859-3',
		'.28594' => 'iso-8859-4',
		'.28595' => 'iso-8859-5',
		'.28596' => 'iso-8859-6',
		'.28597' => 'iso-8859-7',
		'.28598' => 'iso-8859-8',
		'.28599' => 'iso-8859-9',
		'.28603' => 'iso-8859-13',
		'.28605' => 'iso-8859-15',

		'.1125' => 'cp1125',
		'.20866' => 'koi8-r',
		'.21866' => 'koi8-u',
		'.950' => 'big5',
		'.936' => 'euc-cn',
		'.20932' => 'euc-js',
		'.949' => 'euc-kr',
	);

	public static function DetectSystemCharset() : string
	{
		$sLocale = \strtolower(\trim(\setlocale(LC_ALL, '')));
		foreach (static::$aLocaleMapping as $sKey => $sValue) {
			if (\str_contains($sLocale, $sKey) || \str_contains($sLocale, '.'.$sValue)) {
				return $sValue;
			}
		}
		return '';
	}

	public static function ConvertSystemString(string $sSrt) : string
	{
		$sSrt = \trim($sSrt);
		if (!empty($sSrt) && !Utils::IsUtf8($sSrt)) {
			$sCharset = static::DetectSystemCharset();
			$sSrt = $sCharset
				? Utils::ConvertEncoding($sSrt, $sCharset, Enumerations\Charset::UTF_8)
				: \mb_convert_encoding($sSrt, 'UTF-8', 'ISO-8859-1');
		}
		return $sSrt;
	}

}
