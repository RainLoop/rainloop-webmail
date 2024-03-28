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

	public static function NormalizeCharset(string $sEncoding, bool $bAsciAsUtf8 = false) : string
	{
		$sEncoding = \preg_replace('/^iso8/', 'iso-8', \strtolower($sEncoding));

		switch ($sEncoding)
		{
			case 'asci':
			case 'ascii':
			case 'us-asci':
			case 'us-ascii':
				return $bAsciAsUtf8 ? Enumerations\Charset::UTF_8 :
					Enumerations\Charset::ISO_8859_1;

			case 'unicode-1-1-utf-7':
			case 'unicode-1-utf-7':
			case 'unicode-utf-7':
				return 'utf-7';

			case 'utf8':
			case 'utf-8':
				return Enumerations\Charset::UTF_8;

			case 'utf7imap':
			case 'utf-7imap':
			case 'utf7-imap':
			case 'utf-7-imap':
				return 'utf7-imap';

			case 'ks-c-5601-1987':
			case 'ks_c_5601-1987':
			case 'ks_c_5601_1987':
				return 'euc-kr';

			case 'x-gbk':
				return 'gb2312';

			case 'iso-8859-i':
			case 'iso-8859-8-i':
				return 'iso-8859-8';
		}

		return \preg_replace('/^(cp-?|windows?)(12[\d])/', 'windows-$1', $sEncoding);
	}

	public static function NormalizeCharsetByValue(string $sCharset, string $sValue) : string
	{
		$sCharset = static::NormalizeCharset($sCharset);

		if (Enumerations\Charset::UTF_8 !== $sCharset &&
			static::IsUtf8($sValue) &&
			!\str_contains($sCharset, Enumerations\Charset::ISO_2022_JP)
		)
		{
			$sCharset = Enumerations\Charset::UTF_8;
		}

		return $sCharset;
	}

	public static function MbSupportedEncoding(string $sEncoding) : bool
	{
		static $aSupportedEncodings = null;
		if (null === $aSupportedEncodings) {
			$aSupportedEncodings = \array_diff(\mb_list_encodings(), ['BASE64','UUENCODE','HTML-ENTITIES','Quoted-Printable']);
			$aSupportedEncodings = \array_map('strtoupper', \array_unique(
				\array_merge(
					$aSupportedEncodings,
					\array_merge(
						...\array_map(
							'mb_encoding_aliases',
							$aSupportedEncodings
						)
					)
				)
			));
		}
		return \in_array(\strtoupper($sEncoding), $aSupportedEncodings);
	}

	private static $RenameEncoding = [
		'SHIFT_JIS' => 'SJIS'
	];

	public static function MbConvertEncoding(string $sInputString, ?string $sFromEncoding, string $sToEncoding) : string
	{
		$sToEncoding = \strtoupper($sToEncoding);
		if ($sFromEncoding) {
			$sFromEncoding = \strtoupper($sFromEncoding);
			if (isset(static::$RenameEncoding[$sFromEncoding])) {
				$sFromEncoding = static::$RenameEncoding[$sFromEncoding];
			}
/*
			if ('UTF-8' === $sFromEncoding && $sToEncoding === 'UTF7-IMAP' && \is_callable('imap_utf8_to_mutf7')) {
				$sResult = \imap_utf8_to_mutf7($sInputString);
				if (false !== $sResult) {
					return $sResult;
				}
			}

			if ('BASE64' === $sFromEncoding) {
				static::Base64Decode($sFromEncoding);
				$sFromEncoding = null;
			} else if ('UUENCODE' === $sFromEncoding) {
				\convert_uudecode($sFromEncoding);
				$sFromEncoding = null;
			} else if ('QUOTED-PRINTABLE' === $sFromEncoding) {
				\quoted_printable_decode($sFromEncoding);
				$sFromEncoding = null;
			} else
*/
			if (!static::MbSupportedEncoding($sFromEncoding)) {
				if (\function_exists('iconv')) {
					$sResult = \iconv($sFromEncoding, "{$sToEncoding}//IGNORE", $sInputString);
					return (false !== $sResult) ? $sResult : $sInputString;
				}
				\error_log("Unsupported encoding {$sFromEncoding}");
				$sFromEncoding = null;
//				return $sInputString;
			}
		}

		\mb_substitute_character('none');
		$sResult = \mb_convert_encoding($sInputString, $sToEncoding, $sFromEncoding);
		\mb_substitute_character(0xFFFD);

		return (false !== $sResult) ? $sResult : $sInputString;
	}

	public static function ConvertEncoding(string $sInputString, string $sFromEncoding, string $sToEncoding) : string
	{
		$sFromEncoding = static::NormalizeCharset($sFromEncoding);
		$sToEncoding = static::NormalizeCharset($sToEncoding);

		if ('' === \trim($sInputString) || ($sFromEncoding === $sToEncoding && Enumerations\Charset::UTF_8 !== $sFromEncoding))
		{
			return $sInputString;
		}

		return static::MbConvertEncoding($sInputString, $sFromEncoding, $sToEncoding);
	}

	public static function IsAscii(string $sValue) : bool
	{
		return '' === \trim($sValue)
			|| !\preg_match('/[^\x09\x10\x13\x0A\x0D\x20-\x7E]/', $sValue);
	}

	public static function StripSpaces(string $sValue) : string
	{
		return static::Trim(
			\preg_replace('/[\s]+/u', ' ', $sValue));
	}

	public static function IsUtf8(string $sValue) : bool
	{
		return \mb_check_encoding($sValue, 'UTF-8');
	}

	public static function FormatFileSize(int $iSize, int $iRound = 0) : string
	{
		$aSizes = array('B', 'KB', 'MB');
		for ($iIndex = 0; $iSize > 1024 && isset($aSizes[$iIndex + 1]); ++$iIndex) {
			$iSize /= 1024;
		}
		return \round($iSize, $iRound).$aSizes[$iIndex];
	}

	public static function DecodeEncodingValue(string $sEncodedValue, string $sEncodingType) : string
	{
		$sResult = $sEncodedValue;
		switch (\strtolower($sEncodingType))
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

	public static function DecodeHeaderValue(string $sEncodedValue, string $sIncomingCharset = '') : string
	{
		$sValue = $sEncodedValue;
		if (\strlen($sIncomingCharset)) {
			$sIncomingCharset = static::NormalizeCharsetByValue($sIncomingCharset, $sValue);

			$sValue = static::ConvertEncoding($sValue, $sIncomingCharset, Enumerations\Charset::UTF_8);
		}

		$sValue = \preg_replace('/\?=[\n\r\t\s]{1,5}=\?/m', '?==?', $sValue);
		$sValue = \preg_replace('/[\r\n\t]+/m', ' ', $sValue);

		$aEncodeArray = array('');
		$aMatch = array();
//		\preg_match_all('/=\?[^\?]+\?[q|b|Q|B]\?[^\?]*?\?=/', $sValue, $aMatch);
		\preg_match_all('/=\?[^\?]+\?[q|b|Q|B]\?.*?\?=/', $sValue, $aMatch);

		if (isset($aMatch[0]) && \is_array($aMatch[0])) {
			for ($iIndex = 0, $iLen = \count($aMatch[0]); $iIndex < $iLen; ++$iIndex) {
				if (isset($aMatch[0][$iIndex])) {
					$iPos = \strpos($aMatch[0][$iIndex], '*');
					if (false !== $iPos) {
						$aMatch[0][$iIndex][0] = \substr($aMatch[0][$iIndex][0], 0, $iPos);
					}
				}
			}

			$aEncodeArray = $aMatch[0];
		}

		$aParts = array();

		$sMainCharset = '';
		$bOneCharset = true;

		for ($iIndex = 0, $iLen = \count($aEncodeArray); $iIndex < $iLen; ++$iIndex) {
			$aTempArr = array('', $aEncodeArray[$iIndex]);
			if ('=?' === \substr(\trim($aTempArr[1]), 0, 2)) {
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

			if (\strlen($aTempArr[0])) {
				$sCharset = static::NormalizeCharset($aTempArr[0], true);

				if ('' === $sMainCharset) {
					$sMainCharset = $sCharset;
				} else if ($sMainCharset !== $sCharset) {
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

		for ($iIndex = 0, $iLen = \count($aParts); $iIndex < $iLen; ++$iIndex) {
			if ($bOneCharset) {
				$sValue = \str_replace($aParts[$iIndex][0], $aParts[$iIndex][1], $sValue);
			} else {
				$aParts[$iIndex][2] = static::NormalizeCharsetByValue($aParts[$iIndex][2], $aParts[$iIndex][1]);

				$sValue = \str_replace($aParts[$iIndex][0],
					static::ConvertEncoding($aParts[$iIndex][1], $aParts[$iIndex][2], Enumerations\Charset::UTF_8),
					$sValue);
			}
		}

		if ($bOneCharset && \strlen($sMainCharset)) {
			$sMainCharset = static::NormalizeCharsetByValue($sMainCharset, $sValue);
			$sValue = static::ConvertEncoding($sValue, $sMainCharset, Enumerations\Charset::UTF_8);
		}

		return $sValue;
	}

	public static function RemoveHeaderFromHeaders(string $sIncHeaders, array $aHeadersToRemove = array()) : string
	{
		$sResultHeaders = $sIncHeaders;

		if ($aHeadersToRemove) {
			$aHeadersToRemove = \array_map('strtolower', $aHeadersToRemove);

			$sIncHeaders = \preg_replace('/[\r\n]+/', "\n", $sIncHeaders);
			$aHeaders = \explode("\n", $sIncHeaders);

			$bSkip = false;
			$aResult = array();

			foreach ($aHeaders as $sLine) {
				if (\strlen($sLine)) {
					$sFirst = \substr($sLine,0,1);
					if (' ' === $sFirst || "\t" === $sFirst) {
						if (!$bSkip) {
							$aResult[] = $sLine;
						}
					} else {
						$bSkip = false;
						$aParts = \explode(':', $sLine, 2);

						if (!empty($aParts) && !empty($aParts[0])) {
							if (\in_array(\strtolower(\trim($aParts[0])), $aHeadersToRemove)) {
								$bSkip = true;
							} else {
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

	/**
	 * https://datatracker.ietf.org/doc/html/rfc2047
	 */
	public static function EncodeHeaderValue(string $sValue, string $sEncodeType = 'B') : string
	{
		$sValue = \trim($sValue);
		if (\strlen($sValue) && !static::IsAscii($sValue)) {
			switch (\strtoupper($sEncodeType))
			{
				case 'B':
					return '=?'.\strtolower(Enumerations\Charset::UTF_8).
						'?B?'.\base64_encode($sValue).'?=';

				case 'Q':
					return '=?'.\strtolower(Enumerations\Charset::UTF_8).
						'?Q?'.\str_replace(array('?', ' ', '_'), array('=3F', '_', '=5F'),
							\quoted_printable_encode($sValue)).'?=';
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

		if (\strlen($sAttrName) + $iVlen > $iLen - 3) {
			$sections = array();
			$section = 0;

			for ($i = 0, $j = 0; $i < $iVlen; $i += $j) {
				$j = $iLen - $iNlen - \strlen($section) - 4;
				$sections[$section++] = \substr($sValue, $i, $j);
			}

			for ($i = 0, $n = $section; $i < $n; ++$i) {
				$sections[$i] = ' '.$sAttrName.'*'.$i.'*='.$sections[$i];
			}

			return \implode(";\r\n", $sections);
		}
		return $sAttrName.'*='.$sValue;
	}

	public static function EncodeHeaderUtf8AttributeValue(string $sAttrName, string $sValue) : string
	{
		$sAttrName = \trim($sAttrName);
		$sValue = \trim($sValue);

		if (\strlen($sValue) && !static::IsAscii($sValue)) {
			$sValue = static::AttributeRfc2231Encode($sAttrName, $sValue);
		} else {
			$sValue = $sAttrName.'="'.\str_replace('"', '\\"', $sValue).'"';
		}

		return \trim($sValue);
	}

	/**
	 * @deprecated use getEmailAddressLocalPart
	 */
	public static function GetAccountNameFromEmail(string $sEmail) : string
	{
		return static::getEmailAddressLocalPart($sEmail);
	}
	public static function getEmailAddressLocalPart(string $sEmail) : string
	{
		$iPos = \strrpos($sEmail, '@');
		return (false === $iPos) ? $sEmail : \substr($sEmail, 0, $iPos);
	}

	/**
	 * @deprecated use getEmailAddressDomain
	 */
	public static function GetDomainFromEmail(string $sEmail) : string
	{
		return static::getEmailAddressDomain($sEmail);
	}
	public static function getEmailAddressDomain(string $sEmail) : string
	{
		$iPos = \strrpos($sEmail, '@');
		return (false === $iPos) ? '' : \substr($sEmail, $iPos + 1);
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

	/**
	 * @staticvar bool $bValidateAction
	 */
	public static function ResetTimeLimit(int $iTimeToReset = 15, int $iTimeToAdd = 120) : bool
	{
		$iTime = \time();
		if ($iTime < $_SERVER['REQUEST_TIME_FLOAT'] + 5) {
			// do nothing first 5s
			return true;
		}

		static $bValidateAction = null;
		static $iResetTimer = null;

		if (null === $bValidateAction) {
			$iResetTimer = 0;

			$bValidateAction = static::FunctionCallable('set_time_limit');
		}

		if ($bValidateAction && $iTimeToReset < $iTime - $iResetTimer) {
			$iResetTimer = $iTime;
			if (!\set_time_limit($iTimeToAdd)) {
				$bValidateAction = false;
				return false;
			}

			return true;
		}

		return false;
	}

	/**
	 * Replace control characters, ampersand and reserved characters (based on Win95 VFAT)
	 * en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
	 */
	public static function SecureFileName(string $sFileName) : string
	{
		return \preg_replace('#[|\\\\?*<":>+\\[\\]/&\\pC]#su', '-', $sFileName);
	}

	public static function Trim(string $sValue) : string
	{
		return \trim(\preg_replace('/^[\x00-\x1F]+|[\x00-\x1F]+$/Du', '', \trim($sValue)));
	}

	public static function RecRmDir(string $sDir) : bool
	{
		return static::RecTimeDirRemove($sDir, 0);
	}

	public static function RecTimeDirRemove(string $sDir, int $iTime2Kill) : bool
	{
		\clearstatcache();
		if (\is_dir($sDir)) {
			$iTime = \time() - $iTime2Kill;
			$iterator = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator($sDir, \FilesystemIterator::SKIP_DOTS),
				\RecursiveIteratorIterator::CHILD_FIRST);
			foreach ($iterator as $path) {
				if ($path->isFile() && (!$iTime2Kill || $path->getMTime() < $iTime)) {
					\is_callable('opcache_invalidate') && \opcache_invalidate($path, true);
					\unlink($path);
				} else if ($path->isDir() && (!$iTime2Kill || !(new \FilesystemIterator($path))->valid())) {
					\rmdir($path);
				}
			}
			\clearstatcache();
//			\realpath_cache_size() && \clearstatcache(true);
			return !(new \FilesystemIterator($sDir))->valid() && \rmdir($sDir);
		}

		return false;
	}

	public static function Utf8Clear(?string $sUtfString) : string
	{
		if (!\strlen($sUtfString)) {
			return '';
		}

		$sSubstitute = ''; // '�' 0xFFFD
/*
		$converter = new \UConverter('UTF-8', 'UTF-8');
		$converter->setSubstChars($sSubstitute);
		$sNewUtfString = $converter->->convert($sUtfString);
//		$sNewUtfString = \UConverter::transcode($str, 'UTF-8', 'UTF-8', [????]);
*/
		\mb_substitute_character($sSubstitute ?: 'none');
		$sNewUtfString = \mb_convert_encoding($sUtfString, 'UTF-8', 'UTF-8');
		\mb_substitute_character(0xFFFD);

		return (false !== $sNewUtfString) ? $sNewUtfString : $sUtfString;
//		return (false !== $sNewUtfString) ? \preg_replace('/\\p{Cc}/u', '', $sNewUtfString) : $sUtfString;
	}

	public static function Base64Decode(string $sString) : string
	{
		$sResultString = \base64_decode($sString, true);
		if (false === $sResultString) {
			$sString = \str_replace(array(' ', "\r", "\n", "\t"), '', $sString);
			$sString = \preg_replace('/[^a-zA-Z0-9=+\/](.*)$/', '', $sString);

			if (false !== \strpos(\trim(\trim($sString), '='), '=')) {
				$sString = \preg_replace('/=([^=])/', '= $1', $sString);
				$aStrings = \explode(' ', $sString);
				foreach ($aStrings as $iIndex => $sParts) {
					$aStrings[$iIndex] = \base64_decode($sParts);
				}

				$sResultString = \implode('', $aStrings);
			} else {
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
		return \base64_decode(\strtr($sValue, '-_', '+/'), true);
	}

	/**
	 * @param resource $fResource
	 */
	public static function FpassthruWithTimeLimitReset($fResource, int $iBufferLen = 8192) : bool
	{
		$bResult = \is_resource($fResource);
		if ($bResult) {
			while (!\feof($fResource)) {
				$sBuffer = \fread($fResource, $iBufferLen);
				if (false === $sBuffer) {
					break;
				}
				echo $sBuffer;
				static::ResetTimeLimit();
			}
		}

		return $bResult;
	}

	/**
	 * @param resource $rRead
	 * @param resource $rWrite
	 */
	public static function WriteStream($rRead, $rWrite, int $iBufferLen = 8192, bool $bFixCrLf = false, bool $bRewindOnComplete = false) : int
	{
		if (!\is_resource($rRead) || !\is_resource($rWrite)) {
			return -1;
		}

		$iResult = 0;

		while (!\feof($rRead)) {
			$sBuffer = \fread($rRead, $iBufferLen);
			if (false === $sBuffer) {
				return -1;
			}

			if ('' === $sBuffer) {
				break;
			}

			if ($bFixCrLf) {
				$sBuffer = \str_replace("\n", "\r\n", \str_replace("\r", '', $sBuffer));
			}

			$iResult += \strlen($sBuffer);

			if (false === \fwrite($rWrite, $sBuffer)) {
				return -1;
			}

			static::ResetTimeLimit();
		}

		if ($bRewindOnComplete) {
			\rewind($rWrite);
		}

		return $iResult;
	}

	public static function Utf7ModifiedToUtf8(string $sStr) : string
	{
		// imap_mutf7_to_utf8() doesn't support U+10000 and up,
		// thats why mb_convert_encoding is used
		return static::MbConvertEncoding($sStr, 'UTF7-IMAP', 'UTF-8');
	}

	public static function Utf8ToUtf7Modified(string $sStr) : string
	{
		return static::MbConvertEncoding($sStr, 'UTF-8', 'UTF7-IMAP');
	}

	public static function FunctionsCallable(array $aFunctionNames) : bool
	{
		foreach ($aFunctionNames as $sFunctionName) {
			if (!static::FunctionCallable($sFunctionName)) {
				return false;
			}
		}
		return true;
	}

	private static $disabled_functions = null;
	public static function FunctionCallable(string $sFunctionName) : bool
	{
		if (null === static::$disabled_functions) {
			static::$disabled_functions = \array_map('trim', \explode(',', \ini_get('disable_functions')));
		}
/*
		$disabled_classes = \explode(',', \ini_get('disable_classes'));
		\in_array($function, $disabled_classes);
*/
		return \function_exists($sFunctionName)
			&& !\in_array($sFunctionName, static::$disabled_functions);
//			&& \is_callable($mFunctionNameOrNames);
	}

	public static function Sha1Rand(string $sAdditionalSalt = '') : string
	{
		return \sha1($sAdditionalSalt . \random_bytes(16));
	}

	public static function ValidateIP(string $sIp) : bool
	{
		return !empty($sIp) && $sIp === \filter_var($sIp, FILTER_VALIDATE_IP);
	}

	/**
	 * @deprecated
	 */
	public static function IdnToUtf8(string $sStr) : string
	{
		$trace = \debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2)[1];
		\SnappyMail\Log::warning('MailSo', "Deprecated function IdnToUtf8 called at {$trace['file']}#{$trace['line']}");
		if (\preg_match('/(^|\.|@)xn--/i', $sStr)) {
			$sStr = \str_contains($sStr, '@')
			? \SnappyMail\IDN::emailToUtf8($string)
			: \idn_to_utf8($string);
		}
		return $sStr;
	}

	/**
	 * @deprecated
	 */
	public static function IdnToAscii(string $sStr, bool $bLowerCase = false) : string
	{
		$trace = \debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2)[1];
		\SnappyMail\Log::warning('MailSo', "Deprecated function IdnToAscii called at {$trace['file']}#{$trace['line']}");
		$aParts = \explode('@', $sStr);
		$sDomain = \array_pop($aParts);
		if (\preg_match('/[^\x20-\x7E]/', $sDomain)) {
			$sDomain = \idn_to_ascii($string);
		}
		if ($bLowerCase) {
			$sDomain = \strtolower($sDomain);
		}
		$aParts[] = $sDomain;
		return \implode('@', $aParts);
	}
}
