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
abstract class Utils
{
	/**
	 * @var string
	 */
	static $sValidUtf8Regexp = <<<'END'
/
  (
    (?: [\x00-\x7F]                 # single-byte sequences   0xxxxxxx
    |   [\xC0-\xDF][\x80-\xBF]      # double-byte sequences   110xxxxx 10xxxxxx
    |   [\xE0-\xEF][\x80-\xBF]{2}   # triple-byte sequences   1110xxxx 10xxxxxx * 2
    |   [\xF0-\xF7][\x80-\xBF]{3}   # quadruple-byte sequence 11110xxx 10xxxxxx * 3
    ){1,100}                        # ...one or more times
  )
| .                                 # anything else
/x
END;

	/**
	 * @var array
	 */
	public static $SuppostedCharsets = array(
		'iso-8859-1', 'iso-8859-2', 'iso-8859-3', 'iso-8859-4', 'iso-8859-5', 'iso-8859-6',
		'iso-8859-7', 'iso-8859-8', 'iso-8859-9', 'iso-8859-10', 'iso-8859-11', 'iso-8859-12',
		'iso-8859-13', 'iso-8859-14', 'iso-8859-15', 'iso-8859-16',
		'koi8-r', 'koi8-u', 'koi8-ru',
		'cp1125', 'cp1250', 'cp1251', 'cp1252', 'cp1253', 'cp1254', 'cp1257', 'cp949', 'cp1133',
		'cp850', 'cp866', 'cp1255', 'cp1256', 'cp862', 'cp874', 'cp932', 'cp950', 'cp1258',
		'windows-1250', 'windows-1251', 'windows-1252', 'windows-1253', 'windows-1254', 'windows-1255',
		'windows-1256', 'windows-1257', 'windows-1258', 'windows-874',
		'macroman', 'maccentraleurope', 'maciceland', 'maccroatian', 'macromania', 'maccyrillic',
		'macukraine', 'macgreek', 'macturkish', 'macintosh', 'machebrew', 'macarabic',
		'euc-jp', 'shift_jis', 'iso-2022-jp', 'iso-2022-jp-2', 'iso-2022-jp-1',
		'euc-cn', 'gb2312', 'hz', 'gbk', 'gb18030', 'euc-tw', 'big5', 'big5-hkscs',
		'iso-2022-cn', 'iso-2022-cn-ext', 'euc-kr', 'iso-2022-kr', 'johab',
		'armscii-8', 'georgian-academy', 'georgian-ps', 'koi8-t',
		'tis-620', 'macthai', 'mulelao-1',
		'viscii', 'tcvn', 'hp-roman8', 'nextstep',
		'utf-8', 'ucs-2', 'ucs-2be', 'ucs-2le', 'ucs-4', 'ucs-4be', 'ucs-4le',
		'utf-16', 'utf-16be', 'utf-16le', 'utf-32', 'utf-32be', 'utf-32le', 'utf-7',
		'c99', 'java', 'ucs-2-internal', 'ucs-4-internal'
	);

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
		$sResult = '';
		$sLocale = \setlocale(LC_ALL, '');
		$sLocaleLower = \strtolower(\trim($sLocale));

		foreach (static::$aLocaleMapping as $sKey => $sValue)
		{
			if (false !== \strpos($sLocaleLower, $sKey) ||
				false !== \strpos($sLocaleLower, '.'.$sValue))
			{
				$sResult = $sValue;
				break;
			}
		}

		return $sResult;
	}

	public static function ConvertSystemString(string $sSrt) : string
	{
		$sSrt = \trim($sSrt);
		if (!empty($sSrt) && !static::IsUtf8($sSrt))
		{
			$sCharset = static::DetectSystemCharset();
			if (!empty($sCharset))
			{
				$sSrt = static::ConvertEncoding(
					$sSrt, $sCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
			}
			else
			{
				$sSrt = \utf8_encode($sSrt);
			}
		}

		return $sSrt;
	}

	public static function NormalizeCharset(string $sEncoding, bool $bAsciAsUtf8 = false) : string
	{
		$sEncoding = \strtolower($sEncoding);

		$sEncoding = \preg_replace('/^iso8/', 'iso-8', $sEncoding);
		$sEncoding = \preg_replace('/^cp-([\d])/', 'cp$1', $sEncoding);
		$sEncoding = \preg_replace('/^windows?12/', 'windows-12', $sEncoding);

		switch ($sEncoding)
		{
			case 'asci':
			case 'ascii':
			case 'us-asci':
			case 'us-ascii':
				$sEncoding = $bAsciAsUtf8 ? \MailSo\Base\Enumerations\Charset::UTF_8 :
					\MailSo\Base\Enumerations\Charset::ISO_8859_1;
				break;
			case 'unicode-1-1-utf-7':
			case 'unicode-1-utf-7':
			case 'unicode-utf-7':
				$sEncoding = \MailSo\Base\Enumerations\Charset::UTF_7;
				break;
			case 'utf8':
			case 'utf-8':
				$sEncoding = \MailSo\Base\Enumerations\Charset::UTF_8;
				break;
			case 'utf7imap':
			case 'utf-7imap':
			case 'utf7-imap':
			case 'utf-7-imap':
				$sEncoding = \MailSo\Base\Enumerations\Charset::UTF_7_IMAP;
				break;
			case 'ks-c-5601-1987':
			case 'ks_c_5601-1987':
			case 'ks_c_5601_1987':
				$sEncoding = 'euc-kr';
				break;
			case 'x-gbk':
				$sEncoding = 'gb2312';
				break;
			case 'iso-8859-i':
			case 'iso-8859-8-i':
				$sEncoding = \MailSo\Base\Enumerations\Charset::ISO_8859_8;
				break;
		}

		return $sEncoding;
	}

	public static function NormalizeCharsetByValue(string $sCharset, string $sValue) : string
	{
		$sCharset = static::NormalizeCharset($sCharset);

		if (\MailSo\Base\Enumerations\Charset::UTF_8 !== $sCharset &&
			static::IsUtf8($sValue) &&
			false === \strpos($sCharset, \MailSo\Base\Enumerations\Charset::ISO_2022_JP)
		)
		{
			$sCharset = \MailSo\Base\Enumerations\Charset::UTF_8;
		}

		return $sCharset;
	}

	/**
	 * @param function $fFileExistsCallback = null
	 */
	public static function SmartFileExists(string $sFilePath, $fFileExistsCallback = null) : string
	{
		$sFilePath = \str_replace('\\', '/', \trim($sFilePath));
		if (!$fFileExistsCallback)
		{
			$fFileExistsCallback = function ($sPath) {
				return \file_exists($sPath);
			};
		}

		if (!\call_user_func($fFileExistsCallback, $sFilePath))
		{
			return $sFilePath;
		}

		$aFileInfo = \pathinfo($sFilePath);

		$iIndex = 0;

		do
		{
			$iIndex++;

			$sFilePathNew = $aFileInfo['dirname'].'/'.
				\preg_replace('/\(\d{1,2}\)$/', '', $aFileInfo['filename']).
				' ('.$iIndex.')'.
				(empty($aFileInfo['extension']) ? '' : '.'.$aFileInfo['extension'])
			;

			if (!\call_user_func($fFileExistsCallback, $sFilePathNew))
			{
				$sFilePath = $sFilePathNew;
				break;
			}
			else if (10 < $iIndex)
			{
				break;
			}
		}
		while (true);

		return $sFilePath;
	}

	public static function ValidateCharsetName(string $sCharset) : bool
	{
		$sCharset = \strtolower(static::NormalizeCharset($sCharset));
		return 0 < \strlen($sCharset) && (\in_array($sCharset, array(\MailSo\Base\Enumerations\Charset::UTF_7_IMAP)) ||
			\in_array($sCharset, static::$SuppostedCharsets));
	}

	public static function MbConvertEncoding(string $sInputString, string $sInputFromEncoding, string $sInputToEncoding) : string
	{
		static $sMbstringSubCh = null;
		if (null === $sMbstringSubCh)
		{
			$sMbstringSubCh = \mb_substitute_character();
		}

		\mb_substitute_character('none');
		$sResult = \mb_convert_encoding($sInputString, \strtoupper($sInputToEncoding), \strtoupper($sInputFromEncoding));
		\mb_substitute_character($sMbstringSubCh);

		return $sResult;
	}

	public static function ConvertEncoding(string $sInputString, string $sInputFromEncoding, string $sInputToEncoding) : string
	{
		$sResult = $sInputString;

		$sFromEncoding = static::NormalizeCharset($sInputFromEncoding);
		$sToEncoding = static::NormalizeCharset($sInputToEncoding);

		if ('' === \trim($sResult) || ($sFromEncoding === $sToEncoding && \MailSo\Base\Enumerations\Charset::UTF_8 !== $sFromEncoding))
		{
			return $sResult;
		}

		$bUnknown = false;
		switch (true)
		{
			default:
				$bUnknown = true;
				break;

			case ($sFromEncoding === \MailSo\Base\Enumerations\Charset::ISO_8859_1 &&
					$sToEncoding === \MailSo\Base\Enumerations\Charset::UTF_8 &&
					\function_exists('utf8_encode')):

				$sResult = \utf8_encode($sResult);
				break;

			case ($sFromEncoding === \MailSo\Base\Enumerations\Charset::UTF_8 &&
					$sToEncoding === \MailSo\Base\Enumerations\Charset::ISO_8859_1 &&
					\function_exists('utf8_decode')):

				$sResult = \utf8_decode($sResult);
				break;

			case ($sFromEncoding === \MailSo\Base\Enumerations\Charset::UTF_7_IMAP &&
					$sToEncoding === \MailSo\Base\Enumerations\Charset::UTF_8):

				$sResult = static::Utf7ModifiedToUtf8($sResult);
				if (false === $sResult)
				{
					$sResult = $sInputString;
				}
				break;

			case ($sFromEncoding === \MailSo\Base\Enumerations\Charset::UTF_8 &&
					$sToEncoding === \MailSo\Base\Enumerations\Charset::UTF_7_IMAP):

				$sResult = static::Utf8ToUtf7Modified($sResult);
				if (false === $sResult)
				{
					$sResult = $sInputString;
				}
				break;

			case ($sFromEncoding === \MailSo\Base\Enumerations\Charset::UTF_7_IMAP):

				$sResult = static::ConvertEncoding(
					static::ModifiedToPlainUtf7($sResult),
					\MailSo\Base\Enumerations\Charset::UTF_7,
					$sToEncoding
				);
				break;

			case (\in_array(\strtolower($sFromEncoding), static::$SuppostedCharsets)):

				$sResult = static::MbConvertEncoding($sResult, $sFromEncoding, $sToEncoding);
				$sResult = (false !== $sResult) ? $sResult : $sInputString;
				break;
		}

		if ($bUnknown)
		{
			$sResult = \mb_convert_encoding($sResult, $sToEncoding);
		}

		return $sResult;
	}

	public static function IsAscii(string $sValue) : bool
	{
		if ('' === \trim($sValue))
		{
			return true;
		}

		return !\preg_match('/[^\x09\x10\x13\x0A\x0D\x20-\x7E]/', $sValue);
	}

	public static function StrToLowerIfAscii(string $sValue) : string
	{
		return static::IsAscii($sValue) ? \strtolower($sValue) : $sValue;
	}

	public static function StrToUpperIfAscii(string $sValue) : string
	{
		return static::IsAscii($sValue) ? \strtoupper($sValue) : $sValue;
	}

	public static function StrMailDomainToLowerIfAscii(string $sValue) : string
	{
		$aParts = \explode('@', $sValue, 2);
		if (!empty($aParts[1]))
		{
			$aParts[1] = static::IsAscii($aParts[1]) ? \strtolower($aParts[1]) : $aParts[1];
		}

		return \implode('@', $aParts);
	}

	public static function StripSpaces(string $sValue) : string
	{
		return static::Trim(
			\preg_replace('/[\s]+/u', ' ', $sValue));
	}

	public static function IsUtf8(string $sValue) : bool
	{
		return (bool) (\function_exists('mb_check_encoding') ?
			\mb_check_encoding($sValue, 'UTF-8') : \preg_match('//u', $sValue));
	}

	public static function FormatFileSize(int $iSize, int $iRound = 0) : string
	{
		$aSizes = array('B', 'KB', 'MB');
		for ($iIndex = 0; $iSize > 1024 && isset($aSizes[$iIndex + 1]); $iIndex++)
		{
			$iSize /= 1024;
		}
		return \round($iSize, $iRound).$aSizes[$iIndex];
	}

	public static function DecodeEncodingValue(string $sEncodedValue, string $sEncodeingType) : string
	{
		$sResult = $sEncodedValue;
		switch (\strtolower($sEncodeingType))
		{
			case 'q':
			case 'quoted_printable':
			case 'quoted-printable':
				$sResult = \quoted_printable_decode($sResult);
				break;
			case 'b':
			case 'base64':
				$sResult = static::Base64Decode($sResult);
				break;
		}
		return $sResult;
	}

	public static function DecodeFlowedFormat(string $sInputValue) : string
	{
		return \preg_replace('/ ([\r]?[\n])/m', ' ', $sInputValue);
	}

	public static function DecodeHeaderValue(string $sEncodedValue, string $sIncomingCharset = '', string $sForcedIncomingCharset = '') : string
	{
		$sValue = $sEncodedValue;
		if (0 < \strlen($sIncomingCharset))
		{
			$sIncomingCharset = static::NormalizeCharsetByValue($sIncomingCharset, $sValue);

			$sValue = static::ConvertEncoding($sValue, $sIncomingCharset,
				\MailSo\Base\Enumerations\Charset::UTF_8);
		}

		$sValue = \preg_replace('/\?=[\n\r\t\s]{1,5}=\?/m', '?==?', $sValue);
		$sValue = \preg_replace('/[\r\n\t]+/m', ' ', $sValue);

		$aEncodeArray = array('');
		$aMatch = array();
//		\preg_match_all('/=\?[^\?]+\?[q|b|Q|B]\?[^\?]*?\?=/', $sValue, $aMatch);
		\preg_match_all('/=\?[^\?]+\?[q|b|Q|B]\?.*?\?=/', $sValue, $aMatch);

		if (isset($aMatch[0]) && \is_array($aMatch[0]))
		{
			for ($iIndex = 0, $iLen = \count($aMatch[0]); $iIndex < $iLen; $iIndex++)
			{
				if (isset($aMatch[0][$iIndex]))
				{
					$iPos = \strpos($aMatch[0][$iIndex], '*');
					if (false !== $iPos)
					{
						$aMatch[0][$iIndex][0] = \substr($aMatch[0][$iIndex][0], 0, $iPos);
					}
				}
			}

			$aEncodeArray = $aMatch[0];
		}

		$aParts = array();

		$sMainCharset = '';
		$bOneCharset = true;

		for ($iIndex = 0, $iLen = \count($aEncodeArray); $iIndex < $iLen; $iIndex++)
		{
			$aTempArr = array('', $aEncodeArray[$iIndex]);
			if ('=?' === \substr(\trim($aTempArr[1]), 0, 2))
			{
				$iPos = \strpos($aTempArr[1], '?', 2);
				$aTempArr[0] = \substr($aTempArr[1], 2, $iPos - 2);
				$sEncType = \strtoupper($aTempArr[1][$iPos + 1]);
				switch ($sEncType)
				{
					case 'Q':
						$sHeaderValuePart = \str_replace('_', ' ', $aTempArr[1]);
						$aTempArr[1] = \quoted_printable_decode(\substr(
							$sHeaderValuePart, $iPos + 3, \strlen($sHeaderValuePart) - $iPos - 5));
						break;
					case 'B':
						$sHeaderValuePart = $aTempArr[1];
						$aTempArr[1] = static::Base64Decode(\substr(
							$sHeaderValuePart, $iPos + 3, \strlen($sHeaderValuePart) - $iPos - 5));
						break;
				}
			}

			if (0 < \strlen($aTempArr[0]))
			{
				$sCharset = 0 === \strlen($sForcedIncomingCharset) ? $aTempArr[0] : $sForcedIncomingCharset;
				$sCharset = static::NormalizeCharset($sCharset, true);

				if ('' === $sMainCharset)
				{
					$sMainCharset = $sCharset;
				}
				else if ($sMainCharset !== $sCharset)
				{
					$bOneCharset = false;
				}
			}

			$aParts[] = array(
				$aEncodeArray[$iIndex],
				$aTempArr[1],
				$sCharset
			);

			unset($aTempArr);
		}

		for ($iIndex = 0, $iLen = \count($aParts); $iIndex < $iLen; $iIndex++)
		{
			if ($bOneCharset)
			{
				$sValue = \str_replace($aParts[$iIndex][0], $aParts[$iIndex][1], $sValue);
			}
			else
			{
				$aParts[$iIndex][2] = static::NormalizeCharsetByValue($aParts[$iIndex][2], $aParts[$iIndex][1]);

				$sValue = \str_replace($aParts[$iIndex][0],
					static::ConvertEncoding($aParts[$iIndex][1], $aParts[$iIndex][2], \MailSo\Base\Enumerations\Charset::UTF_8),
					$sValue);
			}
		}

		if ($bOneCharset && 0 < \strlen($sMainCharset))
		{
			$sMainCharset = static::NormalizeCharsetByValue($sMainCharset, $sValue);
			$sValue = static::ConvertEncoding($sValue, $sMainCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
		}

		return $sValue;
	}

	public static function RemoveHeaderFromHeaders(string $sIncHeaders, array $aHeadersToRemove = array()) : string
	{
		$sResultHeaders = $sIncHeaders;

		if ($aHeadersToRemove)
		{
			$aHeadersToRemove = \array_map('strtolower', $aHeadersToRemove);

			$sIncHeaders = \preg_replace('/[\r\n]+/', "\n", $sIncHeaders);
			$aHeaders = \explode("\n", $sIncHeaders);

			$bSkip = false;
			$aResult = array();

			foreach ($aHeaders as $sLine)
			{
				if (0 < \strlen($sLine))
				{
					$sFirst = \substr($sLine,0,1);
					if (' ' === $sFirst || "\t" === $sFirst)
					{
						if (!$bSkip)
						{
							$aResult[] = $sLine;
						}
					}
					else
					{
						$bSkip = false;
						$aParts = \explode(':', $sLine, 2);

						if (!empty($aParts) && !empty($aParts[0]))
						{
							if (\in_array(\strtolower(\trim($aParts[0])), $aHeadersToRemove))
							{
								$bSkip = true;
							}
							else
							{
								$aResult[] = $sLine;
							}
						}
					}
				}
			}

			$sResultHeaders = \implode("\r\n", $aResult);
		}

		return $sResultHeaders;
	}

	public static function EncodeUnencodedValue(string $sEncodeType, string $sValue) : string
	{
		$sValue = \trim($sValue);
		if (0 < \strlen($sValue) && !static::IsAscii($sValue))
		{
			switch (\strtoupper($sEncodeType))
			{
				case 'B':
					$sValue = '=?'.\strtolower(\MailSo\Base\Enumerations\Charset::UTF_8).
						'?B?'.\base64_encode($sValue).'?=';
					break;

				case 'Q':
					$sValue = '=?'.\strtolower(\MailSo\Base\Enumerations\Charset::UTF_8).
						'?Q?'.\str_replace(array('?', ' ', '_'), array('=3F', '_', '=5F'),
							\quoted_printable_encode($sValue)).'?=';
					break;
			}
		}

		return $sValue;
	}

	public static function AttributeRfc2231Encode(string $sAttrName, string $sValue, string $sCharset = 'utf-8', string $sLang = '', int $iLen = 1000) : string
	{
		$sValue = \strtoupper($sCharset).'\''.$sLang.'\''.
			\preg_replace_callback('/[\x00-\x20*\'%()<>@,;:\\\\"\/[\]?=\x80-\xFF]/', function ($match) {
				return \rawurlencode($match[0]);
			}, $sValue);

		$iNlen = \strlen($sAttrName);
		$iVlen = \strlen($sValue);

		if (\strlen($sAttrName) + $iVlen > $iLen - 3)
		{
			$sections = array();
			$section = 0;

			for ($i = 0, $j = 0; $i < $iVlen; $i += $j)
			{
				$j = $iLen - $iNlen - \strlen($section) - 4;
				$sections[$section++] = \substr($sValue, $i, $j);
			}

			for ($i = 0, $n = $section; $i < $n; $i++)
			{
				$sections[$i] = ' '.$sAttrName.'*'.$i.'*='.$sections[$i];
			}

			return \implode(";\r\n", $sections);
		}
		else
		{
			return $sAttrName.'*='.$sValue;
		}
	}

	public static function EncodeHeaderUtf8AttributeValue(string $sAttrName, string $sValue) : string
	{
		$sAttrName = \trim($sAttrName);
		$sValue = \trim($sValue);

		if (0 < \strlen($sValue) && !static::IsAscii($sValue))
		{
			$sValue = static::AttributeRfc2231Encode($sAttrName, $sValue);
		}
		else
		{
			$sValue = $sAttrName.'="'.\str_replace('"', '\\"', $sValue).'"';
		}

		return \trim($sValue);
	}

	public static function GetAccountNameFromEmail(string $sEmail) : string
	{
		$sResult = '';
		if (0 < \strlen($sEmail))
		{
			$iPos = \strrpos($sEmail, '@');
			$sResult = (false === $iPos) ? $sEmail : \substr($sEmail, 0, $iPos);
		}

		return $sResult;
	}

	public static function GetDomainFromEmail(string $sEmail) : string
	{
		$sResult = '';
		if (0 < \strlen($sEmail))
		{
			$iPos = \strrpos($sEmail, '@');
			if (false !== $iPos && 0 < $iPos)
			{
				$sResult = \substr($sEmail, $iPos + 1);
			}
		}

		return $sResult;
	}

	public static function GetClearDomainName(string $sDomain) : string
	{
		$sResultDomain = \preg_replace(
			'/^(webmail|email|mail|www|imap4|imap|demo|client|ssl|secure|test|cloud|box|m)\./i',
				'', $sDomain);

		return false === \strpos($sResultDomain, '.') ? $sDomain : $sResultDomain;
	}

	public static function GetFileExtension(string $sFileName) : string
	{
		$iLast = \strrpos($sFileName, '.');
		return false === $iLast ? '' : \strtolower(\substr($sFileName, $iLast + 1));
	}

	public static function MimeContentType(string $sFileName) : string
	{
		$sResult = 'application/octet-stream';
		$sFileName = \trim(\strtolower($sFileName));

		if ('winmail.dat' === $sFileName)
		{
			return 'application/ms-tnef';
		}

		$aMimeTypes = array(

			'eml'	=> 'message/rfc822',
			'mime'	=> 'message/rfc822',
			'txt'	=> 'text/plain',
			'text'	=> 'text/plain',
			'def'	=> 'text/plain',
			'list'	=> 'text/plain',
			'in'	=> 'text/plain',
			'ini'	=> 'text/plain',
			'log'	=> 'text/plain',
			'sql'	=> 'text/plain',
			'cfg'	=> 'text/plain',
			'conf'	=> 'text/plain',
			'rtx'	=> 'text/richtext',
			'vcard'	=> 'text/vcard',
			'vcf'	=> 'text/vcard',
			'htm'	=> 'text/html',
			'html'	=> 'text/html',
			'csv'	=> 'text/csv',
			'ics'	=> 'text/calendar',
			'ifb'	=> 'text/calendar',
			'xml'	=> 'text/xml',
			'json'	=> 'application/json',
			'swf'	=> 'application/x-shockwave-flash',
			'hlp'	=> 'application/winhlp',
			'wgt'	=> 'application/widget',
			'chm'	=> 'application/vnd.ms-htmlhelp',
			'asc'   => 'application/pgp-signature',
			'p10'	=> 'application/pkcs10',
			'p7c'	=> 'application/pkcs7-mime',
			'p7m'	=> 'application/pkcs7-mime',
			'p7s'	=> 'application/pkcs7-signature',
			'torrent'	=> 'application/x-bittorrent',

			// scripts
			'js'	=> 'application/javascript',
			'pl'	=> 'text/perl',
			'css'	=> 'text/css',
			'asp'	=> 'text/asp',
			'php'	=> 'application/x-php',

			// images
			'png'	=> 'image/png',
			'jpg'	=> 'image/jpeg',
			'jpeg'	=> 'image/jpeg',
			'jpe'	=> 'image/jpeg',
			'jfif'	=> 'image/jpeg',
			'gif'	=> 'image/gif',
			'bmp'	=> 'image/bmp',
			'cgm'	=> 'image/cgm',
			'ief'	=> 'image/ief',
			'ico'	=> 'image/x-icon',
			'tif'	=> 'image/tiff',
			'tiff'	=> 'image/tiff',
			'svg'	=> 'image/svg+xml',
			'svgz'	=> 'image/svg+xml',
			'djv'	=> 'image/vnd.djvu',
			'djvu'	=> 'image/vnd.djvu',
			'webp'	=> 'image/webp',

			// archives
			'zip'	=> 'application/zip',
			'7z'	=> 'application/x-7z-compressed',
			'rar'	=> 'application/x-rar-compressed',
			'exe'	=> 'application/x-msdownload',
			'dll'	=> 'application/x-msdownload',
			'scr'	=> 'application/x-msdownload',
			'com'	=> 'application/x-msdownload',
			'bat'	=> 'application/x-msdownload',
			'msi'	=> 'application/x-msdownload',
			'cab'	=> 'application/vnd.ms-cab-compressed',
			'gz'	=> 'application/x-gzip',
			'tgz'	=> 'application/x-gzip',
			'bz'	=> 'application/x-bzip',
			'bz2'	=> 'application/x-bzip2',
			'deb'	=> 'application/x-debian-package',

			// fonts
			'psf'	=> 'application/x-font-linux-psf',
			'otf'	=> 'application/x-font-otf',
			'pcf'	=> 'application/x-font-pcf',
			'snf'	=> 'application/x-font-snf',
			'ttf'	=> 'application/x-font-ttf',
			'ttc'	=> 'application/x-font-ttf',

			// audio
			'aac'	=> 'audio/aac',
			'flac'	=> 'audio/flac',
			'mp3'	=> 'audio/mpeg',
			'aif'	=> 'audio/aiff',
			'aifc'	=> 'audio/aiff',
			'aiff'	=> 'audio/aiff',
			'wav'	=> 'audio/x-wav',
			'midi'	=> 'audio/midi',
			'mp4a'	=> 'audio/mp4',
			'ogg'	=> 'audio/ogg',
			'weba'	=> 'audio/webm',
			'm3u'	=> 'audio/x-mpegurl',

			// video
			'qt'	=> 'video/quicktime',
			'mov'	=> 'video/quicktime',
			'avi'	=> 'video/x-msvideo',
			'mpg'	=> 'video/mpeg',
			'mpeg'	=> 'video/mpeg',
			'mpe'	=> 'video/mpeg',
			'm1v'	=> 'video/mpeg',
			'm2v'	=> 'video/mpeg',
			'3gp'	=> 'video/3gpp',
			'3g2'	=> 'video/3gpp2',
			'h261'	=> 'video/h261',
			'h263'	=> 'video/h263',
			'h264'	=> 'video/h264',
			'jpgv'	=> 'video/jpgv',
			'mp4'	=> 'video/mp4',
			'mp4v'	=> 'video/mp4',
			'mpg4'	=> 'video/mp4',
			'ogv'	=> 'video/ogg',
			'webm'	=> 'video/webm',
			'm4v'	=> 'video/x-m4v',
			'asf'	=> 'video/x-ms-asf',
			'asx'	=> 'video/x-ms-asf',
			'wm'	=> 'video/x-ms-wm',
			'wmv'	=> 'video/x-ms-wmv',
			'wmx'	=> 'video/x-ms-wmx',
			'wvx'	=> 'video/x-ms-wvx',
			'movie'	=> 'video/x-sgi-movie',

			// adobe
			'pdf'	=> 'application/pdf',
			'psd'	=> 'image/vnd.adobe.photoshop',
			'ai'	=> 'application/postscript',
			'eps'	=> 'application/postscript',
			'ps'	=> 'application/postscript',

			// ms office
			'doc'	=> 'application/msword',
			'dot'	=> 'application/msword',
			'rtf'	=> 'application/rtf',
			'xls'	=> 'application/vnd.ms-excel',
			'ppt'	=> 'application/vnd.ms-powerpoint',
			'docx'	=> 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'xlsx'	=> 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'dotx'	=> 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
			'pptx'	=> 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

			// open office
			'odt'	=> 'application/vnd.oasis.opendocument.text',
			'ods'	=> 'application/vnd.oasis.opendocument.spreadsheet',
			'odp'	=> 'application/vnd.oasis.opendocument.presentation'

		);

		$sExt = static::GetFileExtension($sFileName);
		if (0 < \strlen($sExt) && isset($aMimeTypes[$sExt]))
		{
			$sResult = $aMimeTypes[$sExt];
		}

		return $sResult;
	}

	public static function ContentTypeType(string $sContentType, string $sFileName) : string
	{
		$sResult = '';
		$sContentType = \strtolower($sContentType);
		if (0 === \strpos($sContentType, 'image/'))
		{
			$sResult = 'image';
		}
		else
		{
			switch ($sContentType)
			{
				case 'application/zip':
				case 'application/x-7z-compressed':
				case 'application/x-rar-compressed':
				case 'application/x-msdownload':
				case 'application/vnd.ms-cab-compressed':
				case 'application/x-gzip':
				case 'application/x-bzip':
				case 'application/x-bzip2':
				case 'application/x-debian-package':
					$sResult = 'archive';
					break;
				case 'application/msword':
				case 'application/rtf':
				case 'application/vnd.ms-excel':
				case 'application/vnd.ms-powerpoint':
				case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
				case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
				case 'application/vnd.openxmlformats-officedocument.wordprocessingml.template':
				case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
				case 'application/vnd.oasis.opendocument.text':
				case 'application/vnd.oasis.opendocument.spreadsheet':
					$sResult = 'doc';
					break;
				case 'application/pdf':
				case 'application/x-pdf':
					$sResult = 'pdf';
					break;
			}

			if ('' === $sResult)
			{
				switch (\strtolower(static::GetFileExtension($sFileName)))
				{
					case 'zip':
					case '7z':
					case 'rar':
						$sResult = 'archive';
						break;
				}
			}
		}

		return $sResult;
	}

	/**
	 * @staticvar bool $bValidateAction
	 */
	public static function ResetTimeLimit(int $iTimeToReset = 15, int $iTimeToAdd = 120) : bool
	{
		$iTime = \time();
		if ($iTime < \MailSo\Base\Loader::$InitTime + 5)
		{
			// do nothing first 5s
			return true;
		}

		static $bValidateAction = null;
		static $iResetTimer = null;

		if (null === $bValidateAction)
		{
			$iResetTimer = 0;

			$bValidateAction = static::FunctionExistsAndEnabled('set_time_limit');
		}

		if ($bValidateAction && $iTimeToReset < $iTime - $iResetTimer)
		{
			$iResetTimer = $iTime;
			if (!\set_time_limit($iTimeToAdd))
			{
				$bValidateAction = false;
				return false;
			}

			return true;
		}

		return false;
	}

	public static function InlineRebuildStringToJsString(string $sText) : string
	{
		static $aJsonReplaces = array(
			array('\\', "\n", "\t", "\r", '\b', "\f", '"'),
			array('\\\\', '\\n', '\\t', '\\r', '\\b', '\\f', '\"')
		);

		return \str_replace('</script>', '<\/script>',
			\str_replace($aJsonReplaces[0], $aJsonReplaces[1], $sText));
	}

	public static function ClearArrayUtf8Values(array &$aInput)
	{
		foreach ($aInput as $mKey => $mItem)
		{
			if (\is_string($mItem))
			{
				$aInput[$mKey] = static::Utf8Clear($mItem);
			}
			else if (\is_array($mItem))
			{
				static::ClearArrayUtf8Values($mItem);
				$aInput[$mKey] = $mItem;
			}
		}
	}

	/**
	 * @param mixed $mInput
	 */
	public static function Php2js($mInput, ?\MailSo\Log\Logger $oLogger = null) : string
	{
		$sResult = \json_encode($mInput, JSON_UNESCAPED_UNICODE);
		if (!\is_string($sResult) || '' === $sResult)
		{
			if (!$oLogger && \MailSo\Log\Logger::IsSystemEnabled())
			{
				$oLogger = \MailSo\Config::$SystemLogger;
			}

			if ($oLogger)
			{
				$oLogger->Write('json_encode: '.\trim(
						(static::FunctionExistsAndEnabled('json_last_error') ? ' [Error Code: '.\json_last_error().']' : '').
						(static::FunctionExistsAndEnabled('json_last_error_msg') ? ' [Error Message: '.\json_last_error_msg().']' : '')
					), \MailSo\Log\Enumerations\Type::WARNING, 'JSON'
				);
			}

			if (\is_array($mInput))
			{
				if ($oLogger)
				{
					$oLogger->WriteDump($mInput, \MailSo\Log\Enumerations\Type::INFO, 'JSON');
					$oLogger->Write('Trying to clear Utf8 before json_encode', \MailSo\Log\Enumerations\Type::INFO, 'JSON');
				}

				static::ClearArrayUtf8Values($mInput);
				$sResult = \json_encode($mInput, JSON_UNESCAPED_UNICODE);
			}
		}

		return $sResult;
	}

	public static function ClearFileName(string $sFileName) : string
	{
		return static::Trim(static::ClearNullBite(
			static::StripSpaces(
				\str_replace(array('"', '/', '\\', '*', '?', '<', '>', '|', ':'), ' ', $sFileName))));
	}

	public static function ClearXss(string $sValue) : string
	{
		return static::Trim(static::ClearNullBite(
			\str_replace(array('"', '/', '\\', '*', '?', '<', '>', '|', ':'), ' ', $sValue)));
	}

	public static function Trim(string $sValue) : string
	{
		return \trim(\preg_replace('/^[\x00-\x1F]+|[\x00-\x1F]+$/Du', '', \trim($sValue)));
	}

	public static function RecRmDir(string $sDir) : bool
	{
		if (\is_dir($sDir))
		{
			$aObjects = \scandir($sDir);
			foreach ($aObjects as $sObject)
			{
				if ('.' !== $sObject && '..' !== $sObject)
				{
//					if ('dir' === \filetype($sDir.'/'.$sObject))
					if (\is_dir($sDir.'/'.$sObject))
					{
						self::RecRmDir($sDir.'/'.$sObject);
					}
					else
					{
						\unlink($sDir.'/'.$sObject);
					}
				}
			}

			return \rmdir($sDir);
		}

		return false;
	}

	public static function CopyDir(string $sSource, string $sDestination)
	{
		if (\is_dir($sSource))
		{
			if (!\is_dir($sDestination))
			{
				\mkdir($sDestination);
			}

			$oDirectory = \dir($sSource);
			if ($oDirectory)
			{
				while (false !== ($sRead = $oDirectory->read()))
				{
					if ('.' === $sRead || '..' === $sRead)
					{
						continue;
					}

					$sPathDir = $sSource.'/'.$sRead;
					if (\is_dir($sPathDir))
					{
						static::CopyDir($sPathDir, $sDestination.'/'.$sRead);
						continue;
					}

					\copy($sPathDir, $sDestination.'/'.$sRead);
				}

				$oDirectory->close();
			}
		}
	}

	public static function RecTimeDirRemove(string $sTempPath, int $iTime2Kill, int $iNow) : bool
	{
		$iFileCount = 0;

		$sTempPath = rtrim($sTempPath, '\\/');
		if (\is_dir($sTempPath))
		{
			$rDirH = \opendir($sTempPath);
			if ($rDirH)
			{
				$bRemoveAllDirs = true;
				while (($sFile = \readdir($rDirH)) !== false)
				{
					if ('.' !== $sFile && '..' !== $sFile)
					{
						if (\is_dir($sTempPath.'/'.$sFile))
						{
							if (!static::RecTimeDirRemove($sTempPath.'/'.$sFile, $iTime2Kill, $iNow))
							{
								$bRemoveAllDirs = false;
							}
						}
						else
						{
							$iFileCount++;
						}
					}
				}

				\closedir($rDirH);
			}

			if ($iFileCount > 0)
			{
				if (static::TimeFilesRemove($sTempPath, $iTime2Kill, $iNow))
				{
					return \rmdir($sTempPath);
				}
			}
			else
			{
				return $bRemoveAllDirs ? \rmdir($sTempPath) : false;
			}

			return false;
		}

		return true;
	}

	public static function TimeFilesRemove(string $sTempPath, int $iTime2Kill, int $iNow)
	{
		$bResult = true;

		$sTempPath = rtrim($sTempPath, '\\/');
		if (\is_dir($sTempPath))
		{
			$rDirH = \opendir($sTempPath);
			if ($rDirH)
			{
				while (($sFile = \readdir($rDirH)) !== false)
				{
					if ($sFile !== '.' && $sFile !== '..')
					{
						if ($iNow - \filemtime($sTempPath.'/'.$sFile) > $iTime2Kill)
						{
							\unlink($sTempPath.'/'.$sFile);
						}
						else
						{
							$bResult = false;
						}
					}
				}

				\closedir($rDirH);
			}
		}

		return $bResult;
	}

	public static function Utf8Truncate(string $sUtfString, int $iLength) : string
	{
		if (\strlen($sUtfString) <= $iLength)
		{
			return $sUtfString;
		}

		while ($iLength >= 0)
		{
			if ((\ord($sUtfString[$iLength]) < 0x80) || (\ord($sUtfString[$iLength]) >= 0xC0))
			{
				return \substr($sUtfString, 0, $iLength);
			}

			$iLength--;
		}

		return '';
	}

	public static function Utf8Clear(?string $sUtfString, string $sReplaceOn = '') : string
	{
		if (!strlen($sUtfString))
		{
			return '';
		}

		$sUtfString = \preg_replace(static::$sValidUtf8Regexp, '$1', $sUtfString);

		$sUtfString = \preg_replace(
			'/\xE0[\x80-\x9F][\x80-\xBF]'.
			'|\xEF\xBF\xBF'.
			'|\xED[\xA0-\xBF][\x80-\xBF]/S', $sReplaceOn, $sUtfString);

		$sUtfString = \preg_replace('/\xEF\xBF\xBD/', '?', $sUtfString);

		$sNewUtfString = static::MbConvertEncoding($sUtfString, 'UTF-8', 'UTF-8');

		if (false !== $sNewUtfString)
		{
			$sUtfString = $sNewUtfString;
		}

		return $sUtfString;
	}

	public static function Base64Decode(string $sString) : string
	{
		$sResultString = \base64_decode($sString, true);
		if (false === $sResultString)
		{
			$sString = \str_replace(array(' ', "\r", "\n", "\t"), '', $sString);
			$sString = \preg_replace('/[^a-zA-Z0-9=+\/](.*)$/', '', $sString);

			if (false !== \strpos(\trim(\trim($sString), '='), '='))
			{
				$sString = \preg_replace('/=([^=])/', '= $1', $sString);
				$aStrings = \explode(' ', $sString);
				foreach ($aStrings as $iIndex => $sParts)
				{
					$aStrings[$iIndex] = \base64_decode($sParts);
				}

				$sResultString = \implode('', $aStrings);
			}
			else
			{
				$sResultString = \base64_decode($sString);
			}
		}

		return $sResultString;
	}

	public static function UrlSafeBase64Encode(string $sValue) : string
	{
		return \rtrim(\strtr(\base64_encode($sValue), '+/', '-_'), '=');
	}

	public static function UrlSafeBase64Decode(string $sValue) : string
	{
		$sValue = \rtrim(\strtr($sValue, '-_.', '+/='), '=');
		return static::Base64Decode(\str_pad($sValue, \strlen($sValue) + (\strlen($sValue) % 4), '=', STR_PAD_RIGHT));
	}

	public static function ParseFetchSequence(string $sSequence) : array
	{
		$aResult = array();
		$sSequence = \trim($sSequence);
		if (0 < \strlen($sSequence))
		{
			$aSequence = \explode(',', $sSequence);
			foreach ($aSequence as $sItem)
			{
				if (false === \strpos($sItem, ':'))
				{
					$aResult[] = (int) $sItem;
				}
				else
				{
					$aItems = \explode(':', $sItem);
					$iMax = \max($aItems[0], $aItems[1]);

					for ($iIndex = $aItems[0]; $iIndex <= $iMax; $iIndex++)
					{
						$aResult[] = (int) $iIndex;
					}
				}
			}
		}

		return $aResult;
	}

	public static function PrepareFetchSequence(array $aSequence) : string
	{
		$aResult = array();
		if (0 < \count($aSequence))
		{
			$iStart = null;
			$iPrev = null;

			foreach ($aSequence as $sItem)
			{
				// simple protection
				if (false !== \strpos($sItem, ':'))
				{
					$aResult[] = $sItem;
					continue;
				}

				$iItem = (int) $sItem;
				if (null === $iStart || null === $iPrev)
				{
					$iStart = $iItem;
					$iPrev = $iItem;
					continue;
				}

				if ($iPrev === $iItem - 1)
				{
					$iPrev = $iItem;
				}
				else
				{
					$aResult[] = $iStart === $iPrev ? $iStart : $iStart.':'.$iPrev;
					$iStart = $iItem;
					$iPrev = $iItem;
				}
			}

			if (null !== $iStart && null !== $iPrev)
			{
				$aResult[] = $iStart === $iPrev ? $iStart : $iStart.':'.$iPrev;
			}
		}

		return \implode(',', $aResult);
	}

	/**
	 * @param resource $fResource
	 */
	public static function FpassthruWithTimeLimitReset($fResource, int $iBufferLen = 8192) : bool
	{
		$bResult = false;
		if (\is_resource($fResource))
		{
			while (!\feof($fResource))
			{
				$sBuffer = \fread($fResource, $iBufferLen);
				if (false !== $sBuffer)
				{
					echo $sBuffer;
					static::ResetTimeLimit();
					continue;
				}

				break;
			}

			$bResult = true;
		}

		return $bResult;
	}

	/**
	 * @param resource $rRead
	 */
	public static function MultipleStreamWriter($rRead, array $aWrite, int $iBufferLen = 8192, bool $bResetTimeLimit = true, bool $bFixCrLf = false, bool $bRewindOnComplete = false) : int
	{
		$mResult = false;
		if ($rRead && 0 < \count($aWrite))
		{
			$mResult = 0;
			while (!\feof($rRead))
			{
				$sBuffer = \fread($rRead, $iBufferLen);
				if (false === $sBuffer)
				{
					$mResult = false;
					break;
				}

				if (0 === $iBufferLen || '' === $sBuffer)
				{
					break;
				}

				if ($bFixCrLf)
				{
					$sBuffer = \str_replace("\n", "\r\n", \str_replace("\r", '', $sBuffer));
				}

				$mResult += \strlen($sBuffer);

				foreach ($aWrite as $rWriteStream)
				{
					$mWriteResult = \fwrite($rWriteStream, $sBuffer);
					if (false === $mWriteResult)
					{
						$mResult = false;
						break 2;
					}
				}

				if ($bResetTimeLimit)
				{
					static::ResetTimeLimit();
				}
			}
		}

		if ($mResult && $bRewindOnComplete)
		{
			foreach ($aWrite as $rWriteStream)
			{
				if (\is_resource($rWriteStream))
				{
					\rewind($rWriteStream);
				}
			}
		}

		return $mResult;
	}

	public static function ModifiedToPlainUtf7(string $sUtfModifiedString) : string
	{
		$sUtf = '';
		$bBase = false;

		for ($iIndex = 0, $iLen = \strlen($sUtfModifiedString); $iIndex < $iLen; $iIndex++)
		{
			if ('&' === $sUtfModifiedString[$iIndex])
			{
				if (isset($sUtfModifiedString[$iIndex+1]) && '-' === $sUtfModifiedString[$iIndex + 1])
				{
					$sUtf .= '&';
					$iIndex++;
				}
				else
				{
					$sUtf .= '+';
					$bBase = true;
				}
			}
			else if ($sUtfModifiedString[$iIndex] == '-' && $bBase)
			{
				$bBase = false;
			}
			else
			{
				if ($bBase && ',' === $sUtfModifiedString[$iIndex])
				{
					$sUtf .= '/';
				}
				else if (!$bBase && '+' === $sUtfModifiedString[$iIndex])
				{
					$sUtf .= '+-';
				}
				else
				{
					$sUtf .= $sUtfModifiedString[$iIndex];
				}
			}
		}

		return $sUtf;
	}

	public static function Utf7ModifiedToUtf8(string $sStr) : string
	{
		$aArray = array(-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
			-1,-1,-1,-1,-1,-1,-1,-1,-1,62, 63,-1,-1,-1,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,
			10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
			41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1);

		$sResult = '';
		$bError = false;
		$iLen = \strlen($sStr);

		for ($iIndex = 0; $iLen > 0; $iIndex++, $iLen--)
		{
			$sChar = $sStr[$iIndex];
			if ($sChar == '&')
			{
				$iIndex++;
				$iLen--;

				$sChar = isset($sStr[$iIndex]) ? $sStr[$iIndex] : null;
				if ($sChar === null)
				{
					break;
				}

				if ($iLen && $sChar == '-')
				{
					$sResult .= '&';
					continue;
				}

				$iCh = 0;
				$iK = 10;
				for (; $iLen > 0; $iIndex++, $iLen--)
				{
					$sChar = $sStr[$iIndex];

					$iB = $aArray[\ord($sChar)];
					if ((\ord($sChar) & 0x80) || $iB == -1)
					{
						break;
					}

					if ($iK > 0)
					{
						$iCh |= $iB << $iK;
						$iK -= 6;
					}
					else
					{
						$iCh |= $iB >> (-$iK);
						if ($iCh < 0x80)
						{
							if (0x20 <= $iCh && $iCh < 0x7f)
							{
								return $bError;
							}

							$sResult .= \chr($iCh);
						}
						else if ($iCh < 0x800)
						{
							$sResult .= \chr(0xc0 | ($iCh >> 6));
							$sResult .= \chr(0x80 | ($iCh & 0x3f));
						}
						else
						{
							$sResult .= \chr(0xe0 | ($iCh >> 12));
							$sResult .= \chr(0x80 | (($iCh >> 6) & 0x3f));
							$sResult .= \chr(0x80 | ($iCh & 0x3f));
						}

						$iCh = ($iB << (16 + $iK)) & 0xffff;
						$iK += 10;
					}
				}

				if (($iCh || $iK < 6) ||
					(!$iLen || $sChar != '-') ||
					($iLen > 2 && '&' === $sStr[$iIndex+1] && '-' !==  $sStr[$iIndex+2]))
				{
					return $bError;
				}
			}
			else if (\ord($sChar) < 0x20 || \ord($sChar) >= 0x7f)
			{
				return $bError;
			}
			else
			{
				$sResult .= $sChar;
			}
		}

		return $sResult;
	}

	public static function Utf8ToUtf7Modified(string $sStr) : string
	{
		$sArray = array('A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S',
			'T','U','V','W','X','Y','Z', 'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o',
			'p','q','r','s','t','u','v','w','x','y','z', '0','1','2','3','4','5','6','7','8','9','+',',');

		$sLen = \strlen($sStr);
		$bIsB = false;
		$iIndex = $iN = 0;
		$sReturn = '';
		$bError = false;
		$iCh = $iB = $iK = 0;

		while ($sLen)
		{
			$iC = \ord($sStr[$iIndex]);
			if ($iC < 0x80)
			{
				$iCh = $iC;
				$iN = 0;
			}
			else if ($iC < 0xc2)
			{
				return $bError;
			}
			else if ($iC < 0xe0)
			{
				$iCh = $iC & 0x1f;
				$iN = 1;
			}
			else if ($iC < 0xf0)
			{
				$iCh = $iC & 0x0f;
				$iN = 2;
			}
			else if ($iC < 0xf8)
			{
				$iCh = $iC & 0x07;
				$iN = 3;
			}
			else if ($iC < 0xfc)
			{
				$iCh = $iC & 0x03;
				$iN = 4;
			}
			else if ($iC < 0xfe)
			{
				$iCh = $iC & 0x01;
				$iN = 5;
			}
			else
			{
				return $bError;
			}

			$iIndex++;
			$sLen--;

			if ($iN > $sLen)
			{
				return $bError;
			}

			for ($iJ = 0; $iJ < $iN; $iJ++)
			{
				$iO = \ord($sStr[$iIndex+$iJ]);
				if (($iO & 0xc0) != 0x80)
				{
					return $bError;
				}

				$iCh = ($iCh << 6) | ($iO & 0x3f);
			}

			if ($iN > 1 && !($iCh >> ($iN * 5 + 1)))
			{
				return $bError;
			}

			$iIndex += $iN;
			$sLen -= $iN;

			if ($iCh < 0x20 || $iCh >= 0x7f)
			{
				if (!$bIsB)
				{
					$sReturn .= '&';
					$bIsB = true;
					$iB = 0;
					$iK = 10;
				}

				if ($iCh & ~0xffff)
				{
					$iCh = 0xfffe;
				}

				$sReturn .= $sArray[($iB | $iCh >> $iK)];
				$iK -= 6;
				for (; $iK >= 0; $iK -= 6)
				{
					$sReturn .= $sArray[(($iCh >> $iK) & 0x3f)];
				}

				$iB = ($iCh << (-$iK)) & 0x3f;
				$iK += 16;
			}
			else
			{
				if ($bIsB)
				{
					if ($iK > 10)
					{
						$sReturn .= $sArray[$iB];
					}
					$sReturn .= '-';
					$bIsB = false;
				}

				$sReturn .= \chr($iCh);
				if ('&' === \chr($iCh))
				{
					$sReturn .= '-';
				}
			}
		}

		if ($bIsB)
		{
			if ($iK > 10)
			{
				$sReturn .= $sArray[$iB];
			}

			$sReturn .= '-';
		}

		return $sReturn;
	}

	public static function FunctionExistsAndEnabled($mFunctionNameOrNames) : bool
	{
		static $aCache = null;

		if (\is_array($mFunctionNameOrNames))
		{
			foreach ($mFunctionNameOrNames as $sFunctionName)
			{
				if (!static::FunctionExistsAndEnabled($sFunctionName))
				{
					return false;
				}
			}

			return true;
		}

		if (empty($mFunctionNameOrNames) || !\function_exists($mFunctionNameOrNames) || !\is_callable($mFunctionNameOrNames))
		{
			return false;
		}

		if (null === $aCache)
		{
			$sDisableFunctions = \ini_get('disable_functions');
			$sDisableFunctions = \is_string($sDisableFunctions) ? $sDisableFunctions : '';

			$aCache = \explode(',', $sDisableFunctions);
		}

		return !\in_array($mFunctionNameOrNames, $aCache);
	}

	public static function ClearNullBite($mValue) : string
	{
		return \str_replace('%00', '', $mValue);
	}

	public static function CharsetDetect(string $sStr) : string
	{
		$mResult = '';
		if (!static::IsAscii($sStr))
		{
			$mResult = \mb_detect_encoding($sStr, 'auto', true);
		}

		return \is_string($mResult) && 0 < \strlen($mResult) ? $mResult : '';
	}

    public static function Md5Rand(string $sAdditionalSalt = '') : string
    {
		return \md5(\microtime(true).\rand(10000, 99999).
			\md5($sAdditionalSalt).\rand(10000, 99999).\microtime(true));
	}

    public static function Sha1Rand(string $sAdditionalSalt = '') : string
    {
		return \sha1(\microtime(true).\rand(10000, 99999).
			\sha1($sAdditionalSalt).\rand(10000, 99999).\microtime(true));
	}

	public static function ValidateDomain(string $sDomain, bool $bSimple = false) : bool
	{
		$aMatch = array();
		if ($bSimple)
		{
			return \preg_match('/.+(\.[a-zA-Z]+)$/', $sDomain, $aMatch) && !empty($aMatch[1]);
		}

		return \preg_match('/.+(\.[a-zA-Z]+)$/', $sDomain, $aMatch) && !empty($aMatch[1]) && \in_array($aMatch[1], \explode(' ',
			'.academy .actor .agency .audio .bar .beer .bike .blue .boutique .cab .camera .camp .capital .cards .careers .cash .catering .center .cheap .city .cleaning .clinic .clothing .club .coffee .community .company .computer .construction .consulting .contractors .cool .credit .dance .dating .democrat .dental .diamonds .digital .direct .directory .discount .domains .education .email .energy .equipment .estate .events .expert .exposed .fail .farm .fish .fitness .florist .fund .futbol .gallery .gift .glass .graphics .guru .help .holdings .holiday .host .hosting .house .institute .international .kitchen .land .life .lighting .limo .link .management .market .marketing .media .menu .moda .partners .parts .photo .photography .photos .pics .pink .press .productions .pub .red .rentals .repair .report .rest .sexy .shoes .social .solar .solutions .space .support .systems .tattoo .tax .technology .tips .today .tools .town .toys .trade .training .university .uno .vacations .vision .vodka .voyage .watch .webcam .wiki .work .works .wtf .zone .aero .asia .biz .cat .com .coop .edu .gov .info .int .jobs .mil .mobi .museum .name .net .org .pro .tel .travel .xxx .xyz '.
			'.ac .ad .ae .af .ag .ai .al .am .an .ao .aq .ar .as .at .au .aw .ax .az .ba .bb .bd .be .bf .bg .bh .bi .bj .bm .bn .bo .br .bs .bt .bv .bw .by .bz .ca .cc .cd .cf .cg .ch .ci .ck .cl .cm .cn .co .cr .cs .cu .cv .cx .cy .cz .dd .de .dj .dk .dm .do .dz .ec .ee .eg .er .es .et .eu .fi .fj .fk .fm .fo .fr .ga .gb .gd .ge .gf .gg .gh .gi .gl .gm .gn .gp .gq .gr .gs .gt .gu .gw .gy .hk .hm .hn .hr .ht .hu .id .ie .il .im .in .io .iq .ir .is .it .je .jm .jo .jp .ke .kg .kh .ki .km .kn .kp .kr .kw .ky .kz .la .lb .lc .li .lk .lr .ls .lt .lu .lv .ly .ma .mc .md .me .mg .mh .mk .ml .mm .mn .mo .mp .mq .mr .ms .mt .mu .mv .mw .mx .my .mz .na .nc .ne .nf .ng .ni .nl .no .np .nr .nu .nz .om .pa .pe .pf .pg .ph .pk .pl .pm .pn .pr .ps .pt .pw .py .qa .re .ro .rs .ru . .rw .sa .sb .sc .sd .se .sg .sh .si .sj .sk .sl .sm .sn .so .sr .st .su .sv .sy .sz .tc .td .tf .tg .th .tj .tk .tl .tm .tn .to .tp .tr .tt .tv .tw .tz .ua .ug .uk .us .uy .uz .va .vc .ve .vg .vi .vn .vu .wf .ws .ye .yt .za .zm .zw'
		));
	}

	public static function ValidateIP(string $sIp) : bool
	{
		return !empty($sIp) && $sIp === \filter_var($sIp, FILTER_VALIDATE_IP);
	}

	public static function IdnToUtf8(string $sStr, bool $bLowerIfAscii = false) : string
	{
		if (0 < \strlen($sStr) && \preg_match('/(^|\.|@)xn--/i', $sStr))
		{
			try
			{
				$sStr = \SnappyMail\IDN::anyToUtf8($sStr);
			}
			catch (\Throwable $oException) {}
		}

		return $bLowerIfAscii ? static::StrMailDomainToLowerIfAscii($sStr) : $sStr;
	}

	public static function IdnToAscii(string $sStr, bool $bLowerIfAscii = false) : string
	{
		$sStr = $bLowerIfAscii ? static::StrMailDomainToLowerIfAscii($sStr) : $sStr;

		$sUser = '';
		$sDomain = $sStr;
		if (false !== \strpos($sStr, '@'))
		{
			$sUser = static::GetAccountNameFromEmail($sStr);
			$sDomain = static::GetDomainFromEmail($sStr);
		}

		if (0 < \strlen($sDomain) && \preg_match('/[^\x20-\x7E]/', $sDomain))
		{
			try
			{
				$sDomain = \SnappyMail\IDN::anyToAscii($sDomain);
			}
			catch (\Throwable $oException) {}
		}

		return ('' === $sUser ? '' : $sUser.'@').$sDomain;
	}

	public static function HashToId(string $sHash, string $sSalt = '') : int
	{
		$sData = $sHash ? @\MailSo\Base\Crypt::Decrypt(\hex2bin($sHash), \md5($sSalt)) : null;

		$aMatch = array();
		if ($sData && preg_match('/^id:(\d+)$/', $sData, $aMatch) && isset($aMatch[1]))
		{
			return is_numeric($aMatch[1]) ? (int) $aMatch[1] : null;
		}

		return null;
	}

	public static function IdToHash(int $iID, string $sSalt = '') : string
	{
		return \bin2hex(\MailSo\Base\Crypt::Encrypt('id:'.$iID, \md5($sSalt)));
	}
}
