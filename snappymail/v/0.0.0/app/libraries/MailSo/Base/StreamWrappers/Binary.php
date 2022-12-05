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
	/** @var resource|null */
	public $context;

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

	public static function GetInlineDecodeOrEncodeFunctionName(string $sContentTransferEncoding, bool $bDecode = true) : string
	{
		switch (\strtolower($sContentTransferEncoding))
		{
			case \MailSo\Base\Enumerations\Encoding::BASE64_LOWER:
				return $bDecode ? 'convert.base64-decode' : 'convert.base64-encode';
			case \MailSo\Base\Enumerations\Encoding::QUOTED_PRINTABLE_LOWER:
				return $bDecode ? 'convert.quoted-printable-decode' : 'convert.quoted-printable-encode';
		}

		return '';
	}

	public static function InlineNullDecode(string $sBodyString, string &$sEndBuffer) : string
	{
		$sEndBuffer = '';
		return $sBodyString;
	}

	public static function InlineConvertDecode(string $sEncodedString, string &$sEndBuffer, string $sFromEncoding, string $sToEncoding) : string
	{
		$sEndBuffer = '';
		$iQuotedPrintableLen = \strlen($sEncodedString);
		$iLastSpace = \strrpos($sEncodedString, ' ');
		if (false !== $iLastSpace && $iLastSpace + 1 < $iQuotedPrintableLen)
		{
			$sEndBuffer = \substr($sEncodedString, $iLastSpace + 1);
			$sEncodedString = \substr($sEncodedString, 0, $iLastSpace + 1);
		}
		return \MailSo\Base\Utils::ConvertEncoding($sEncodedString, $sFromEncoding, $sToEncoding);
	}

	/**
	 * @param resource $rStream
	 */
	public static function IsStreamRemembed($rStream) : bool
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
	 *
	 * @return resource|bool
	 */
	public static function CreateStream($rStream,
		string $sUtilsDecodeOrEncodeFunctionName = null, string $sFromEncoding = null, string $sToEncoding = null)
	{
		if (null === $sUtilsDecodeOrEncodeFunctionName || !\strlen($sUtilsDecodeOrEncodeFunctionName))
		{
			$sUtilsDecodeOrEncodeFunctionName = 'InlineNullDecode';
		}

		$sHashName = \md5(\microtime(true).\rand(1000, 9999));

		if (null !== $sFromEncoding && null !== $sToEncoding && $sFromEncoding !== $sToEncoding)
		{
			$rStream = self::CreateStream($rStream, $sUtilsDecodeOrEncodeFunctionName);
			$sUtilsDecodeOrEncodeFunctionName = 'InlineConvertDecode';
		}

		if (\in_array($sUtilsDecodeOrEncodeFunctionName, ['convert.base64-decode', 'convert.quoted-printable-decode']))
		{
			$rFilter = \stream_filter_append($rStream, $sUtilsDecodeOrEncodeFunctionName);
			return \is_resource($rFilter) ? $rStream : false;
		}
		else if (\in_array($sUtilsDecodeOrEncodeFunctionName, ['convert.base64-encode', 'convert.quoted-printable-encode']))
		{
			$rFilter = \stream_filter_append($rStream, $sUtilsDecodeOrEncodeFunctionName,
				\STREAM_FILTER_READ, array(
					'line-length' => 74,
					'line-break-chars' => "\r\n"
				));
			return \is_resource($rFilter) ? $rStream : false;
		}

		self::$aStreams[$sHashName] =
			array($rStream, $sUtilsDecodeOrEncodeFunctionName, $sFromEncoding, $sToEncoding);

		return \fopen(self::STREAM_NAME.'://'.$sHashName, 'rb');
	}

	public function stream_cast(int $cast_as) /*: resource*/
	{
		return false; // $this->rStream;
	}

	public function stream_open(string $sPath) : bool
	{
		$this->iPos = 0;
		$this->sBuffer = '';
		$this->sReadEndBuffer = '';
		$this->rStream = false;
		$this->sFromEncoding = null;
		$this->sToEncoding = null;
		$this->sFunctionName = null;

		$aPath = \parse_url($sPath);

		if (isset($aPath['host']) && isset($aPath['scheme']) &&
			\strlen($aPath['host']) && \strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				\is_array(self::$aStreams[$sHashName]) &&
				4 === \count(self::$aStreams[$sHashName]))
			{
				$this->rStream = self::$aStreams[$sHashName][0];
				$this->sFunctionName = self::$aStreams[$sHashName][1];
				$this->sFromEncoding = self::$aStreams[$sHashName][2];
				$this->sToEncoding = self::$aStreams[$sHashName][3];
			}

			return \is_resource($this->rStream);
		}

		return false;
	}

	public function stream_read(int $iCount) : string
	{
		$sReturn = '';
		$sFunctionName = $this->sFunctionName;

		if ($iCount > 0)
		{
			if ($iCount < \strlen($this->sBuffer))
			{
				$sReturn = \substr($this->sBuffer, 0, $iCount);
				$this->sBuffer = \substr($this->sBuffer, $iCount);
			}
			else
			{
				$sReturn = $this->sBuffer;
				while ($iCount > 0)
				{
					if (\feof($this->rStream))
					{
						if (!\strlen($this->sBuffer.$sReturn))
						{
							return false;
						}

						if (\strlen($this->sReadEndBuffer))
						{
							$sReturn .= self::$sFunctionName($this->sReadEndBuffer,
								$this->sReadEndBuffer, $this->sFromEncoding, $this->sToEncoding);

							$iDecodeLen = \strlen($sReturn);
						}

						$iCount = 0;
						$this->sBuffer = '';
					}
					else
					{
						$sReadResult = \fread($this->rStream, 8192);
						if (false === $sReadResult)
						{
							return false;
						}

						$sReturn .= self::$sFunctionName($this->sReadEndBuffer.$sReadResult,
							$this->sReadEndBuffer, $this->sFromEncoding, $this->sToEncoding);

						$iDecodeLen = \strlen($sReadResult);
						if ($iCount < $iDecodeLen)
						{
							$this->sBuffer = \substr($sReturn, $iCount);
							$sReturn = \substr($sReturn, 0, $iCount);
							$iCount = 0;
						}
						else
						{
							$iCount -= $iDecodeLen;
						}
					}
				}
			}

			$this->iPos += \strlen($sReturn);
			return $sReturn;
		}

		return false;
	}

	public function stream_write() : int
	{
		return 0;
	}

	public function stream_tell() : int
	{
		return $this->iPos;
	}

	public function stream_eof() : bool
	{
		return !\strlen($this->sBuffer) && \feof($this->rStream);
	}

	public function stream_stat() : array
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

	public function stream_seek() : bool
	{
		return false;
	}
}

\stream_wrapper_register(Binary::STREAM_NAME, Binary::class);
