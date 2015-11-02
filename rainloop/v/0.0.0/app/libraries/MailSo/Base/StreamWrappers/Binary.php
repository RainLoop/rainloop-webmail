<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base\StreamWrappers;

/**
 * @category MailSo
 * @package Base
 * @subpackage StreamWrappers
 */
class Binary
{
	/**
	 * @var string
	 */
	const STREAM_NAME = 'mailsobinary';

	/**
	 * @var array
	 */
	private static $aStreams = array();

	/**
	 * @var array
	 */
	private static $aRememberStreams = array();

	/**
	 * @var resource
	 */
	private $rStream;

	/**
	 * @var string
	 */
	private $sFromEncoding;

	/**
	 * @var string
	 */
	private $sToEncoding;

	/**
	 * @var string
	 */
	private $sFunctionName;

	/**
	 * @var int
	 */
	private $iPos;

	/**
	 * @var string
	 */
	private $sBuffer;

	/**
	 * @var string
	 */
	private $sReadEndBuffer;

	/**
	 * @param string $sContentTransferEncoding
	 * @param bool $bDecode = true
	 *
	 * @return string
	 */
	public static function GetInlineDecodeOrEncodeFunctionName($sContentTransferEncoding, $bDecode = true)
	{
		$sFunctionName = '';
		switch (strtolower($sContentTransferEncoding))
		{
			case \MailSo\Base\Enumerations\Encoding::BASE64_LOWER:
				// InlineBase64Decode
				$sFunctionName = $bDecode ? 'InlineBase64Decode' : 'convert.base64-encode';
				break;
			case \MailSo\Base\Enumerations\Encoding::QUOTED_PRINTABLE_LOWER:
				// InlineQuotedPrintableDecode
				$sFunctionName = $bDecode ? 'convert.quoted-printable-decode' : 'convert.quoted-printable-encode';
				break;
		}

		return $sFunctionName;
	}

	/**
	 * @param string $sBodyString
	 * @param string $sEndBuffer
	 *
	 * @return string
	 */
	public static function InlineNullDecode($sBodyString, &$sEndBuffer)
	{
		$sEndBuffer = '';
		return $sBodyString;
	}

	/**
	 * @param string $sBaseString
	 * @param string $sEndBuffer
	 *
	 * @return string
	 */
	public static function InlineBase64Decode($sBaseString, &$sEndBuffer)
	{
		$sEndBuffer = '';
		$sBaseString = str_replace(array("\r", "\n", "\t"), '', $sBaseString);
		$iBaseStringLen = strlen($sBaseString);
		$iBaseStringNormFloorLen = floor($iBaseStringLen / 4) * 4;
		if ($iBaseStringNormFloorLen < $iBaseStringLen)
		{
			$sEndBuffer = substr($sBaseString, $iBaseStringNormFloorLen);
			$sBaseString = substr($sBaseString, 0, $iBaseStringNormFloorLen);
		}
		return \MailSo\Base\Utils::Base64Decode($sBaseString);
	}

	/**
	 * @param string $sQuotedPrintableString
	 * @param string $sEndBuffer
	 *
	 * @return string
	 */
	public static function InlineQuotedPrintableDecode($sQuotedPrintableString, &$sEndBuffer)
	{
		$sEndBuffer = '';
		$sQuotedPrintableLen = strlen($sQuotedPrintableString);
		$iLastSpace = strrpos($sQuotedPrintableString, ' ');
		if (false !== $iLastSpace && $iLastSpace + 1 < $sQuotedPrintableLen)
		{
			$sEndBuffer = substr($sQuotedPrintableString, $iLastSpace + 1);
			$sQuotedPrintableString = substr($sQuotedPrintableString, 0, $iLastSpace + 1);
		}
		return quoted_printable_decode($sQuotedPrintableString);
	}

	/**
	 * @param string $sEncodedString
	 * @param string $sEndBuffer
	 *
	 * @return string
	 */
	public static function InlineConvertDecode($sEncodedString, &$sEndBuffer, $sFromEncoding, $sToEncoding)
	{
		$sEndBuffer = '';
		$sQuotedPrintableLen = strlen($sEncodedString);
		$iLastSpace = strrpos($sEncodedString, ' ');
		if (false !== $iLastSpace && $iLastSpace + 1 < $sQuotedPrintableLen)
		{
			$sEndBuffer = substr($sEncodedString, $iLastSpace + 1);
			$sEncodedString = substr($sEncodedString, 0, $iLastSpace + 1);
		}
		return \MailSo\Base\Utils::ConvertEncoding($sEncodedString, $sFromEncoding, $sToEncoding);
	}

	/**
	 * @param resource $rStream
	 *
	 * @return bool
	 */
	public static function IsStreamRemembed($rStream)
	{
		foreach (self::$aRememberStreams as $rRem)
		{
			if ($rStream === $rRem)
			{
				return true;
			}
		}

		return false;
	}

	/**
	 * @param resource $rStream
	 */
	public static function RememberStream($rStream)
	{
		if (!self::IsStreamRemembed($rStream))
		{
			self::$aRememberStreams[] = $rStream;
		}
	}

	/**
	 * @param resource $rStream
	 * @param string $sUtilsDecodeOrEncodeFunctionName = null
	 * @param string $sFromEncoding = null
	 * @param string $sToEncoding = null
	 *
	 * @return resource|bool
	 */
	public static function CreateStream($rStream,
		$sUtilsDecodeOrEncodeFunctionName = null, $sFromEncoding = null, $sToEncoding = null)
	{
		if (!in_array(self::STREAM_NAME, stream_get_wrappers()))
		{
			stream_wrapper_register(self::STREAM_NAME, '\MailSo\Base\StreamWrappers\Binary');
		}

		if (null === $sUtilsDecodeOrEncodeFunctionName || 0 === strlen($sUtilsDecodeOrEncodeFunctionName))
		{
			$sUtilsDecodeOrEncodeFunctionName = 'InlineNullDecode';
		}

		$sHashName = md5(microtime(true).rand(1000, 9999));

		if (null !== $sFromEncoding && null !== $sToEncoding && $sFromEncoding !== $sToEncoding)
		{
			$rStream = self::CreateStream($rStream, $sUtilsDecodeOrEncodeFunctionName);
			$sUtilsDecodeOrEncodeFunctionName = 'InlineConvertDecode';
		}

		if (in_array($sUtilsDecodeOrEncodeFunctionName, array(
			'convert.base64-decode', 'convert.base64-encode',
			'convert.quoted-printable-decode', 'convert.quoted-printable-encode'
		)))
		{
			$rFilter = \stream_filter_append($rStream, $sUtilsDecodeOrEncodeFunctionName,
				STREAM_FILTER_READ, array(
					'line-length' => \MailSo\Mime\Enumerations\Constants::LINE_LENGTH,
					'line-break-chars' => \MailSo\Mime\Enumerations\Constants::CRLF
				));

			return \is_resource($rFilter) ? $rStream : false;
		}

		self::$aStreams[$sHashName] =
			array($rStream, $sUtilsDecodeOrEncodeFunctionName, $sFromEncoding, $sToEncoding);

		\MailSo\Base\Loader::IncStatistic('CreateStream/Binary');

		return \fopen(self::STREAM_NAME.'://'.$sHashName, 'rb');
	}

	/**
	 * @param string $sPath
	 *
	 * @return bool
	 */
	public function stream_open($sPath)
	{
		$this->iPos = 0;
		$this->sBuffer = '';
		$this->sReadEndBuffer = '';
		$this->rStream = false;
		$this->sFromEncoding = null;
		$this->sToEncoding = null;
		$this->sFunctionName = null;

		$bResult = false;
		$aPath = parse_url($sPath);

		if (isset($aPath['host']) && isset($aPath['scheme']) &&
			0 < strlen($aPath['host']) && 0 < strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				is_array(self::$aStreams[$sHashName]) &&
				4 === count(self::$aStreams[$sHashName]))
			{
				$this->rStream = self::$aStreams[$sHashName][0];
				$this->sFunctionName = self::$aStreams[$sHashName][1];
				$this->sFromEncoding = self::$aStreams[$sHashName][2];
				$this->sToEncoding = self::$aStreams[$sHashName][3];
			}

			$bResult = is_resource($this->rStream);
		}

		return $bResult;
	}

	/**
	 * @param int $iCount
	 *
	 * @return string
	 */
	public function stream_read($iCount)
	{
		$sReturn = '';
		$sFunctionName = $this->sFunctionName;

		if ($iCount > 0)
		{
			if ($iCount < strlen($this->sBuffer))
			{
				$sReturn = substr($this->sBuffer, 0, $iCount);
				$this->sBuffer = substr($this->sBuffer, $iCount);
			}
			else
			{
				$sReturn = $this->sBuffer;
				while ($iCount > 0)
				{
					if (feof($this->rStream))
					{
						if (0 === strlen($this->sBuffer.$sReturn))
						{
							return false;
						}

						if (0 < strlen($this->sReadEndBuffer))
						{
							$sReturn .= self::$sFunctionName($this->sReadEndBuffer,
								$this->sReadEndBuffer, $this->sFromEncoding, $this->sToEncoding);

							$iDecodeLen = strlen($sReturn);
						}

						$iCount = 0;
						$this->sBuffer = '';
					}
					else
					{
						$sReadResult = fread($this->rStream, 8192);
						if (false === $sReadResult)
						{
							return false;
						}

						$sReturn .= self::$sFunctionName($this->sReadEndBuffer.$sReadResult,
							$this->sReadEndBuffer, $this->sFromEncoding, $this->sToEncoding);

						$iDecodeLen = strlen($sReturn);
						if ($iCount < $iDecodeLen)
						{
							$this->sBuffer = substr($sReturn, $iCount);
							$sReturn = substr($sReturn, 0, $iCount);
							$iCount = 0;
						}
						else
						{
							$iCount -= $iDecodeLen;
						}
					}
				}
			}

			$this->iPos += strlen($sReturn);
			return $sReturn;
		}

		return false;
	}

	/**
	 * @return int
	 */
	public function stream_write()
	{
		return 0;
	}

	/**
	 * @return int
	 */
	public function stream_tell()
	{
		return $this->iPos;
	}

	/**
	 * @return bool
	 */
	public function stream_eof()
	{
		return 0 === strlen($this->sBuffer) && feof($this->rStream);
	}

	/**
	 *
	 * @return array
	 */
	public function stream_stat()
	{
		return array(
			'dev' => 2,
			'ino' => 0,
			'mode' => 33206,
			'nlink' => 1,
			'uid' => 0,
			'gid' => 0,
			'rdev' => 2,
			'size' => 0,
			'atime' => 1061067181,
			'mtime' => 1056136526,
			'ctime' => 1056136526,
			'blksize' => -1,
			'blocks' => -1
		);
	}

	/**
	 * @return bool
	 */
	public function stream_seek()
	{
		return false;
	}
}
