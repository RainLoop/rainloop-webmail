<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
 */
class Part
{
	const POS_HEADERS = 1;
	const POS_BODY = 2;
	const POS_SUBPARTS = 3;
	const POS_CLOSE_BOUNDARY = 4;

	/**
	 * @var string
	 */
	public static $DefaultCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1;

	/**
	 * @var string
	 */
	public static $ForceCharset = '';

	/**
	 * @var HeaderCollection
	 */
	public $Headers;

	/**
	 * @var resource
	 */
	public $Body = null;

	/**
	 * @var PartCollection
	 */
	public $SubParts;

	/**
	 * @var string
	 */
	private $sBoundary = '';

	/**
	 * @var string
	 */
	private $sParentCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1;

	function __construct()
	{
		$this->Headers = new HeaderCollection;
		$this->SubParts = new PartCollection;
	}

	public function Boundary() : string
	{
		return $this->sBoundary;
	}

	public function ParentCharset() : string
	{
		return (\strlen($this->sCharset)) ? $this->sParentCharset : self::$DefaultCharset;
	}

	public function SetParentCharset(string $sParentCharset) : self
	{
		$this->sParentCharset = $sParentCharset;

		return $this;
	}

	public function SetBoundary(string $sBoundary) : self
	{
		$this->sBoundary = $sBoundary;

		return $this;
	}

	public function HeaderCharset() : string
	{
		return ($this->Headers) ? \trim(\strtolower($this->Headers->ParameterValue(
			Enumerations\Header::CONTENT_TYPE,
			Enumerations\Parameter::CHARSET))) : '';
	}

	public function HeaderBoundary() : string
	{
		return ($this->Headers) ? \trim($this->Headers->ParameterValue(
			Enumerations\Header::CONTENT_TYPE,
			Enumerations\Parameter::BOUNDARY)) : '';
	}

	public function ContentType() : string
	{
		return ($this->Headers) ?
			\trim(\strtolower($this->Headers->ValueByName(
				Enumerations\Header::CONTENT_TYPE))) : '';
	}

	public function ContentID() : string
	{
		return ($this->Headers) ? \trim($this->Headers->ValueByName(
			Enumerations\Header::CONTENT_ID)) : '';
	}

	public function ContentLocation() : string
	{
		return ($this->Headers) ? \trim($this->Headers->ValueByName(
			Enumerations\Header::CONTENT_LOCATION)) : '';
	}

	public function IsFlowedFormat() : bool
	{
		$bResult = false;
		if ($this->Headers)
		{
			$bResult = 'flowed' === \trim(\strtolower($this->Headers->ParameterValue(
				Enumerations\Header::CONTENT_TYPE,
				Enumerations\Parameter::FORMAT)));

			if ($bResult && \in_array($this->MailEncodingName(), array('base64', 'quoted-printable')))
			{
				$bResult = false;
			}
		}

		return $bResult;
	}

	public function FileName() : string
	{
		$sResult = '';
		if ($this->Headers)
		{
			$sResult = \trim($this->Headers->ParameterValue(
				Enumerations\Header::CONTENT_DISPOSITION,
				Enumerations\Parameter::FILENAME));

			if (!\strlen($sResult))
			{
				$sResult = \trim($this->Headers->ParameterValue(
					Enumerations\Header::CONTENT_TYPE,
					Enumerations\Parameter::NAME));
			}
		}

		return $sResult;
	}

	public function IsPgpSigned() : bool
	{
		// https://datatracker.ietf.org/doc/html/rfc3156#section-5
		$header = $this->Headers->GetByName(Enumerations\Header::CONTENT_TYPE);
		return $header
		 && \preg_match('#multipart/signed.+protocol=["\']?application/pgp-signature#si', $header->FullValue())
		 // The multipart/signed body MUST consist of exactly two parts.
		 && 2 === \count($this->SubParts)
		 && $this->SubParts[1]->IsPgpSignature();
	}

	public function IsPgpSignature() : bool
	{
		return \in_array($this->ContentType(), array('application/pgp-signature', 'application/pkcs7-signature'));
	}

	public static function FromFile(string $sFileName) : ?self
	{
		$rStreamHandle = \file_exists($sFileName) ? \fopen($sFileName, 'rb') : false;
		if ($rStreamHandle) {
			try {
				return static::FromStream($rStreamHandle);
			} finally {
				\fclose($rStreamHandle);
			}
		}
		return null;
	}

	public static function FromString(string $sRawMessage) : ?self
	{
		$rStreamHandle = \strlen($sRawMessage) ?
			\MailSo\Base\ResourceRegistry::CreateMemoryResource() : false;
		if ($rStreamHandle) {
			\fwrite($rStreamHandle, $sRawMessage);
			unset($sRawMessage);
			\fseek($rStreamHandle, 0);

			try {
				return static::FromStream($rStreamHandle);
			} finally {
				\MailSo\Base\ResourceRegistry::CloseMemoryResource($rStreamHandle);
			}
		}
		return null;
	}

	/**
	 * @param resource $rStreamHandle
	 */
	public $LineParts = [];
	public static function FromStream($rStreamHandle) : ?self
	{
		if (!\is_resource($rStreamHandle)) {
			return null;
		}

		$self = new self;

		$oParserClass = new Parser\ParserMemory;

		$oMimePart = null;
		$bIsOef = false;
		$iOffset = 0;
		$sBuffer = '';
		$sPrevBuffer = '';
		$aBoundaryStack = array();


		$oParserClass->StartParse($self);

		$self->LineParts[] =& $self;
		$self->ParseFromStreamRecursion($rStreamHandle, $oParserClass, $iOffset,
			$sPrevBuffer, $sBuffer, $aBoundaryStack, $bIsOef);

		$sFirstNotNullCharset = null;
		foreach ($self->LineParts as /* @var $oMimePart Part */ $oMimePart)
		{
			$sCharset = $oMimePart->HeaderCharset();
			if (\strlen($sCharset))
			{
				$sFirstNotNullCharset = $sCharset;
				break;
			}
		}

		$sForceCharset = self::$ForceCharset;
		if (\strlen($sForceCharset))
		{
			foreach ($self->LineParts as /* @var $oMimePart Part */ $oMimePart)
			{
				$oMimePart->SetParentCharset($sForceCharset);
				$oMimePart->Headers->SetParentCharset($sForceCharset);
			}
		}
		else
		{
			$sFirstNotNullCharset = (null !== $sFirstNotNullCharset)
				? $sFirstNotNullCharset : self::$DefaultCharset;

			foreach ($self->LineParts as /* @var $oMimePart Part */ $oMimePart)
			{
				$sHeaderCharset = $oMimePart->HeaderCharset();
				$oMimePart->SetParentCharset((\strlen($sHeaderCharset)) ? $sHeaderCharset : $sFirstNotNullCharset);
				$oMimePart->Headers->SetParentCharset($sHeaderCharset);
			}
		}

		$oParserClass->EndParse($self);

		$self->LineParts = [];
		return $self;
	}

	/**
	 * @param resource $rStreamHandle
	 */
	protected function ParseFromStreamRecursion($rStreamHandle, $oCallbackClass, int &$iOffset,
		string &$sPrevBuffer, string &$sBuffer, array &$aBoundaryStack, bool &$bIsOef, bool $bNotFirstRead = false) : self
	{
		$oCallbackClass->StartParseMimePart($this);

		$iPos = 0;
		$iParsePosition = self::POS_HEADERS;
		$sCurrentBoundary = '';
		$bIsBoundaryCheck = false;
		$aHeadersLines = array();
		while (true)
		{
			if (!$bNotFirstRead)
			{
				$sPrevBuffer = $sBuffer;
				$sBuffer = '';
			}

			if (!$bIsOef && !\feof($rStreamHandle))
			{
				if (!$bNotFirstRead)
				{
					$sBuffer = \fread($rStreamHandle, 8192);
					if (false === $sBuffer)
					{
						break;
					}

					$oCallbackClass->ReadBuffer($sBuffer);
				}
				else
				{
					$bNotFirstRead = false;
				}
			}
			else if ($bIsOef && !\strlen($sBuffer))
			{
				break;
			}
			else
			{
				$bIsOef = true;
			}

			while (true)
			{
				$sCurrentLine = $sPrevBuffer.$sBuffer;
				if (self::POS_HEADERS === $iParsePosition)
				{
					$iEndLen = 4;
					$iPos = \strpos($sCurrentLine, "\r\n\r\n", $iOffset);
					if (false === $iPos)
					{
						$iEndLen = 2;
						$iPos = \strpos($sCurrentLine, "\n\n", $iOffset);
					}

					if (false !== $iPos)
					{
						$aHeadersLines[] = \substr($sCurrentLine, $iOffset, $iPos + $iEndLen - $iOffset);

						$this->Headers->Parse(\implode($aHeadersLines))->SetParentCharset($this->HeaderCharset());
						$aHeadersLines = array();

						$oCallbackClass->InitMimePartHeader();

						$sBoundary = $this->HeaderBoundary();
						if (\strlen($sBoundary))
						{
							$sBoundary = '--'.$sBoundary;
							$sCurrentBoundary = $sBoundary;
							\array_unshift($aBoundaryStack, $sBoundary);
						}

						$iOffset = $iPos + $iEndLen;
						$iParsePosition = self::POS_BODY;
						continue;
					}
					else
					{
						$iBufferLen = \strlen($sPrevBuffer);
						if ($iBufferLen > $iOffset)
						{
							$aHeadersLines[] = \substr($sPrevBuffer, $iOffset);
							$iOffset = 0;
						}
						else
						{
							$iOffset -= $iBufferLen;
						}
						break;
					}
				}
				else if (self::POS_BODY === $iParsePosition)
				{
					$iPos = false;
					$sBoundaryLen = 0;
					$bIsBoundaryEnd = false;
					$bCurrentPartBody = false;
					$bIsBoundaryCheck = \count($aBoundaryStack);

					foreach ($aBoundaryStack as $sKey => $sBoundary)
					{
						if (false !== ($iPos = \strpos($sCurrentLine, $sBoundary, $iOffset)))
						{
							if ($sCurrentBoundary === $sBoundary)
							{
								$bCurrentPartBody = true;
							}

							$sBoundaryLen = \strlen($sBoundary);
							if ('--' === \substr($sCurrentLine, $iPos + $sBoundaryLen, 2))
							{
								$sBoundaryLen += 2;
								$bIsBoundaryEnd = true;
								unset($aBoundaryStack[$sKey]);
								$sCurrentBoundary = (isset($aBoundaryStack[$sKey + 1]))
									? $aBoundaryStack[$sKey + 1] : '';
							}

							break;
						}
					}

					if (false !== $iPos)
					{
						$oCallbackClass->WriteBody(\substr($sCurrentLine, $iOffset, $iPos - $iOffset));
						$iOffset = $iPos;

						if ($bCurrentPartBody)
						{
							$iParsePosition = self::POS_SUBPARTS;
							continue;
						}

						$oCallbackClass->EndParseMimePart($this);
						return $this;
					}
					else
					{
						$iBufferLen = \strlen($sPrevBuffer);
						if ($iBufferLen > $iOffset)
						{
							$oCallbackClass->WriteBody(\substr($sPrevBuffer, $iOffset));
							$iOffset = 0;
						}
						else
						{
							$iOffset -= $iBufferLen;
						}
						break;
					}
				}
				else if (self::POS_SUBPARTS === $iParsePosition)
				{
					$iPos = false;
					$iBoundaryLen = 0;
					$bIsBoundaryEnd = false;
					$bCurrentPartBody = false;
					$bIsBoundaryCheck = \count($aBoundaryStack);

					foreach ($aBoundaryStack as $sKey => $sBoundary)
					{
						if (false !== ($iPos = \strpos($sCurrentLine, $sBoundary, $iOffset)))
						{
							if ($sCurrentBoundary === $sBoundary)
							{
								$bCurrentPartBody = true;
							}

							$iBoundaryLen = \strlen($sBoundary);
							if ('--' === \substr($sCurrentLine, $iPos + $iBoundaryLen, 2))
							{
								$iBoundaryLen += 2;
								$bIsBoundaryEnd = true;
								unset($aBoundaryStack[$sKey]);
								$sCurrentBoundary = (isset($aBoundaryStack[$sKey + 1]))
									? $aBoundaryStack[$sKey + 1] : '';
							}
							break;
						}
					}

					if (false !== $iPos && $bCurrentPartBody)
					{
						$iOffset = $iPos + $iBoundaryLen;

						$oSubPart = new self;

						$oSubPart->ParseFromStreamRecursion($rStreamHandle, $oCallbackClass,
								$iOffset, $sPrevBuffer, $sBuffer, $aBoundaryStack, $bIsOef, true);

						$this->SubParts->append($oSubPart);
						$this->LineParts[] =& $oSubPart;
						//$iParsePosition = self::POS_HEADERS;
						unset($oSubPart);
					}
					else
					{
						$oCallbackClass->EndParseMimePart($this);
						return $this;
					}
				}
			}
		}

		if (\strlen($sPrevBuffer))
		{
			if (self::POS_HEADERS === $iParsePosition)
			{
				$aHeadersLines[] = ($iOffset < \strlen($sPrevBuffer))
					? \substr($sPrevBuffer, $iOffset)
					: $sPrevBuffer;

				$this->Headers->Parse(\implode($aHeadersLines))->SetParentCharset($this->HeaderCharset());
				$aHeadersLines = array();

				$oCallbackClass->InitMimePartHeader();
			}
			else if (self::POS_BODY === $iParsePosition)
			{
				if (!$bIsBoundaryCheck)
				{
					$oCallbackClass->WriteBody(($iOffset < \strlen($sPrevBuffer))
						? \substr($sPrevBuffer, $iOffset) : $sPrevBuffer);
				}
			}
		}
		else
		{
			if (self::POS_HEADERS === $iParsePosition && \count($aHeadersLines))
			{
				$this->Headers->Parse(\implode($aHeadersLines))->SetParentCharset($this->HeaderCharset());
				$aHeadersLines = array();

				$oCallbackClass->InitMimePartHeader();
			}
		}

		$oCallbackClass->EndParseMimePart($this);

		return $this;
	}

	/**
	 * @return resource|bool
	 */
	public function ToStream()
	{
		if ($this->Body && \is_resource($this->Body))
		{
			$aMeta = \stream_get_meta_data($this->Body);
			if (!empty($aMeta['seekable']))
			{
				\rewind($this->Body);
			}
		}

		$aSubStreams = array(

			$this->Headers->ToEncodedString() . "\r\n\r\n",

			null === $this->Body ? '' : $this->Body,

			"\r\n"
		);

		if ($this->SubParts->Count())
		{
			$sBoundary = $this->HeaderBoundary();
			if (\strlen($sBoundary))
			{
				$aSubStreams[] = "--{$sBoundary}\r\n";

				$rSubPartsStream = $this->SubParts->ToStream($sBoundary);
				if (\is_resource($rSubPartsStream))
				{
					$aSubStreams[] = $rSubPartsStream;
				}

				$aSubStreams[] = "\r\n--{$sBoundary}--\r\n";
			}
		}

		return \MailSo\Base\StreamWrappers\SubStreams::CreateStream($aSubStreams);
	}
}
