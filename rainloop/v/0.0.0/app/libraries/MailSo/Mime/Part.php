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

	const DEFAUL_BUFFER = 8192;

	/**
	 * @var string
	 */
	public static $DefaultCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1;

	/**
	 * @var string
	 */
	public static $ForceCharset = '';

	/**
	 * @var \MailSo\Mime\HeaderCollection
	 */
	public $Headers;

	/**
	 * @var resource
	 */
	public $Body;

	/**
	 * @var \MailSo\Mime\PartCollection
	 */
	public $SubParts;

	/**
	 * @var array
	 */
	public $LineParts;

	/**
	 * @var string
	 */
	private $sBoundary;

	/**
	 * @var string
	 */
	private $sParentCharset;

	/**
	 * @var int
	 */
	private $iParseBuffer;

	/**
	 * @access private
	 */
	private function __construct()
	{
		$this->iParseBuffer = \MailSo\Mime\Part::DEFAUL_BUFFER;
		$this->Reset();
	}

	/**
	 * @return \MailSo\Mime\Part
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return \MailSo\Mime\Part
	 */
	public function Reset()
	{
		\MailSo\Base\ResourceRegistry::CloseMemoryResource($this->Body);
		$this->Body = null;

		$this->Headers = HeaderCollection::NewInstance();
		$this->SubParts = PartCollection::NewInstance();
		$this->LineParts = array();
		$this->sBoundary = '';
		$this->sParentCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1;

		return $this;
	}

	/**
	 * @return string
	 */
	public function Boundary()
	{
		return $this->sBoundary;
	}

	/**
	 * @return string
	 */
	public function ParentCharset()
	{
		return (0 < \strlen($this->sCharset)) ? $this->sParentCharset : self::$DefaultCharset;
	}

	/**
	 * @param string $sParentCharset
	 * @return \MailSo\Mime\Part
	 */
	public function SetParentCharset($sParentCharset)
	{
		$this->sParentCharset = $sParentCharset;

		return $this;
	}

	/**
	 * @param string $sBoundary
	 * @return \MailSo\Mime\Part
	 */
	public function SetBoundary($sBoundary)
	{
		$this->sBoundary = $sBoundary;

		return $this;
	}

	/**
	 * @param int $iParseBuffer
	 * @return \MailSo\Mime\Part
	 */
	public function SetParseBuffer($iParseBuffer)
	{
		$this->iParseBuffer = $iParseBuffer;

		return $this;
	}

	/**
	 * @return string
	 */
	public function HeaderCharset()
	{
		return ($this->Headers) ? trim(strtolower($this->Headers->ParameterValue(
			\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
			\MailSo\Mime\Enumerations\Parameter::CHARSET))) : '';
	}

	/**
	 * @return string
	 */
	public function HeaderBoundary()
	{
		return ($this->Headers) ? trim($this->Headers->ParameterValue(
			\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
			\MailSo\Mime\Enumerations\Parameter::BOUNDARY)) : '';
	}

	/**
	 * @return string
	 */
	public function ContentType()
	{
		return ($this->Headers) ?
			trim(strtolower($this->Headers->ValueByName(
				\MailSo\Mime\Enumerations\Header::CONTENT_TYPE))) : '';
	}

	/**
	 * @return string
	 */
	public function ContentTransferEncoding()
	{
		return ($this->Headers) ?
			trim(strtolower($this->Headers->ValueByName(
				\MailSo\Mime\Enumerations\Header::CONTENT_TRANSFER_ENCODING))) : '';
	}

	/**
	 * @return string
	 */
	public function ContentID()
	{
		return ($this->Headers) ? trim($this->Headers->ValueByName(
			\MailSo\Mime\Enumerations\Header::CONTENT_ID)) : '';
	}

	/**
	 * @return string
	 */
	public function ContentLocation()
	{
		return ($this->Headers) ? trim($this->Headers->ValueByName(
			\MailSo\Mime\Enumerations\Header::CONTENT_LOCATION)) : '';
	}

	/**
	 * @return bool
	 */
	public function IsFlowedFormat()
	{
		$bResult = false;
		if ($this->Headers)
		{
			$bResult = 'flowed' === \trim(\strtolower($this->Headers->ParameterValue(
				\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
				\MailSo\Mime\Enumerations\Parameter::FORMAT)));

			if ($bResult && \in_array(\strtolower($this->MailEncodingName()), array('base64', 'quoted-printable')))
			{
				$bResult = false;
			}
		}

		return $bResult;
	}

	/**
	 * @return string
	 */
	public function FileName()
	{
		$sResult = '';
		if ($this->Headers)
		{
			$sResult = trim($this->Headers->ParameterValue(
				\MailSo\Mime\Enumerations\Header::CONTENT_DISPOSITION,
				\MailSo\Mime\Enumerations\Parameter::FILENAME));

			if (0 === strlen($sResult))
			{
				$sResult = trim($this->Headers->ParameterValue(
					\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
					\MailSo\Mime\Enumerations\Parameter::NAME));
			}
		}

		return $sResult;
	}

	/**
	 * @param string $sFileName
	 * @return \MailSo\Mime\Part
	 */
	public function ParseFromFile($sFileName)
	{
		$rStreamHandle = (@file_exists($sFileName)) ? @fopen($sFileName, 'rb') : false;
		if (is_resource($rStreamHandle))
		{
			$this->ParseFromStream($rStreamHandle);

			if (is_resource($rStreamHandle))
			{
				fclose($rStreamHandle);
			}
		}

		return $this;
	}

	/**
	 * @param string $sRawMessage
	 * @return \MailSo\Mime\Part
	 */
	public function ParseFromString($sRawMessage)
	{
		$rStreamHandle = (0 < strlen($sRawMessage)) ?
			\MailSo\Base\ResourceRegistry::CreateMemoryResource() : false;

		if (is_resource($rStreamHandle))
		{
			fwrite($rStreamHandle, $sRawMessage);
			unset($sRawMessage);
			fseek($rStreamHandle, 0);

			$this->ParseFromStream($rStreamHandle);

			\MailSo\Base\ResourceRegistry::CloseMemoryResource($rStreamHandle);
		}

		return $this;
	}

	/**
	 * @param resource $rStreamHandle
	 * @return \MailSo\Mime\Part
	 */
	public function ParseFromStream($rStreamHandle)
	{
		$this->Reset();

		$oParserClass = new \MailSo\Mime\Parser\ParserMemory();

		$oMimePart = null;
		$bIsOef = false;
		$iOffset = 0;
		$sBuffer = '';
		$sPrevBuffer = '';
		$aBoundaryStack = array();


		$oParserClass->StartParse($this);

		$this->LineParts[] =& $this;
		$this->ParseFromStreamRecursion($rStreamHandle, $oParserClass, $iOffset,
			$sPrevBuffer, $sBuffer, $aBoundaryStack, $bIsOef);

		$sFirstNotNullCharset = null;
		foreach ($this->LineParts as /* @var $oMimePart \MailSo\Mime\Part */ &$oMimePart)
		{
			$sCharset = $oMimePart->HeaderCharset();
			if (0 < strlen($sCharset))
			{
				$sFirstNotNullCharset = $sCharset;
				break;
			}
		}

		$sForceCharset = self::$ForceCharset;
		if (0 < strlen($sForceCharset))
		{
			foreach ($this->LineParts as /* @var $oMimePart \MailSo\Mime\Part */ &$oMimePart)
			{
				$oMimePart->SetParentCharset($sForceCharset);
				$oMimePart->Headers->SetParentCharset($sForceCharset);
			}
		}
		else
		{
			$sFirstNotNullCharset = (null !== $sFirstNotNullCharset)
				? $sFirstNotNullCharset : self::$DefaultCharset;

			foreach ($this->LineParts as /* @var $oMimePart \MailSo\Mime\Part */ &$oMimePart)
			{
				$sHeaderCharset = $oMimePart->HeaderCharset();
				$oMimePart->SetParentCharset((0 < strlen($sHeaderCharset)) ? $sHeaderCharset : $sFirstNotNullCharset);
				$oMimePart->Headers->SetParentCharset($sHeaderCharset);
			}
		}

		$oParserClass->EndParse($this);

		return $this;
	}

	/**
	 * @param resource $rStreamHandle
	 * @return \MailSo\Mime\Part
	 */
	public function ParseFromStreamRecursion($rStreamHandle, &$oCallbackClass, &$iOffset,
		&$sPrevBuffer, &$sBuffer, &$aBoundaryStack, &$bIsOef, $bNotFirstRead = false)
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

			if (!$bIsOef && !feof($rStreamHandle))
			{
				if (!$bNotFirstRead)
				{
					$sBuffer = @fread($rStreamHandle, $this->iParseBuffer);
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
			else if ($bIsOef && 0 === strlen($sBuffer))
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
					$iPos = strpos($sCurrentLine, "\r\n\r\n", $iOffset);
					if (false === $iPos)
					{
						$iEndLen = 2;
						$iPos = strpos($sCurrentLine, "\n\n", $iOffset);
					}

					if (false !== $iPos)
					{
						$aHeadersLines[] = substr($sCurrentLine, $iOffset, $iPos + $iEndLen - $iOffset);

						$this->Headers->Parse(implode($aHeadersLines))->SetParentCharset($this->HeaderCharset());
						$aHeadersLines = array();

						$oCallbackClass->InitMimePartHeader();

						$sBoundary = $this->HeaderBoundary();
						if (0 < strlen($sBoundary))
						{
							$sBoundary = '--'.$sBoundary;
							$sCurrentBoundary = $sBoundary;
							array_unshift($aBoundaryStack, $sBoundary);
						}

						$iOffset = $iPos + $iEndLen;
						$iParsePosition = self::POS_BODY;
						continue;
					}
					else
					{
						$iBufferLen = strlen($sPrevBuffer);
						if ($iBufferLen > $iOffset)
						{
							$aHeadersLines[] = substr($sPrevBuffer, $iOffset);
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
					$bIsBoundaryCheck = 0 < count($aBoundaryStack);

					foreach ($aBoundaryStack as $sKey => $sBoundary)
					{
						if (false !== ($iPos = strpos($sCurrentLine, $sBoundary, $iOffset)))
						{
							if ($sCurrentBoundary === $sBoundary)
							{
								$bCurrentPartBody = true;
							}

							$sBoundaryLen = strlen($sBoundary);
							if ('--' === substr($sCurrentLine, $iPos + $sBoundaryLen, 2))
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
						$oCallbackClass->WriteBody(substr($sCurrentLine, $iOffset, $iPos - $iOffset));
						$iOffset = $iPos;

						if ($bCurrentPartBody)
						{
							$iParsePosition = self::POS_SUBPARTS;
							continue;
						}

						$oCallbackClass->EndParseMimePart($this);
						return true;
					}
					else
					{
						$iBufferLen = strlen($sPrevBuffer);
						if ($iBufferLen > $iOffset)
						{
							$oCallbackClass->WriteBody(substr($sPrevBuffer, $iOffset));
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
					$sBoundaryLen = 0;
					$bIsBoundaryEnd = false;
					$bCurrentPartBody = false;
					$bIsBoundaryCheck = 0 < count($aBoundaryStack);

					foreach ($aBoundaryStack as $sKey => $sBoundary)
					{
						if (false !== ($iPos = strpos($sCurrentLine, $sBoundary, $iOffset)))
						{
							if ($sCurrentBoundary === $sBoundary)
							{
								$bCurrentPartBody = true;
							}

							$sBoundaryLen = strlen($sBoundary);
							if ('--' === substr($sCurrentLine, $iPos + $sBoundaryLen, 2))
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

					if (false !== $iPos && $bCurrentPartBody)
					{
						$iOffset = $iPos + $sBoundaryLen;

						$oSubPart = self::NewInstance();

						$oSubPart
							->SetParseBuffer($this->iParseBuffer)
							->ParseFromStreamRecursion($rStreamHandle, $oCallbackClass,
								$iOffset, $sPrevBuffer, $sBuffer, $aBoundaryStack, $bIsOef, true);

						$this->SubParts->Add($oSubPart);
						$this->LineParts[] =& $oSubPart;
						//$iParsePosition = self::POS_HEADERS;
						unset($oSubPart);
					}
					else
					{
						$oCallbackClass->EndParseMimePart($this);
						return true;
					}
				}
			}
		}

		if (0 < strlen($sPrevBuffer))
		{
			if (self::POS_HEADERS === $iParsePosition)
			{
				$aHeadersLines[] = ($iOffset < strlen($sPrevBuffer))
					? substr($sPrevBuffer, $iOffset)
					: $sPrevBuffer;

				$this->Headers->Parse(implode($aHeadersLines))->SetParentCharset($this->HeaderCharset());
				$aHeadersLines = array();

				$oCallbackClass->InitMimePartHeader();
			}
			else if (self::POS_BODY === $iParsePosition)
			{
				if (!$bIsBoundaryCheck)
				{
					$oCallbackClass->WriteBody(($iOffset < strlen($sPrevBuffer))
						? substr($sPrevBuffer, $iOffset) : $sPrevBuffer);
				}
			}
		}
		else
		{
			if (self::POS_HEADERS === $iParsePosition && 0 < count($aHeadersLines))
			{
				$this->Headers->Parse(implode($aHeadersLines))->SetParentCharset($this->HeaderCharset());
				$aHeadersLines = array();

				$oCallbackClass->InitMimePartHeader();
			}
		}

		$oCallbackClass->EndParseMimePart($this);

		return $this;
	}

	/**
	 * @return resorce
	 */
	public function Rewind()
	{
		if ($this->Body && \is_resource($this->Body))
		{
			$aMeta = \stream_get_meta_data($this->Body);
			if (isset($aMeta['seekable']) && $aMeta['seekable'])
			{
				\rewind($this->Body);
			}
		}
	}

	/**
	 * @return resorce
	 */
	public function ToStream()
	{
		$this->Rewind();

		$aSubStreams = array(

			$this->Headers->ToEncodedString().
				\MailSo\Mime\Enumerations\Constants::CRLF.
				\MailSo\Mime\Enumerations\Constants::CRLF,

			null === $this->Body ? '' : $this->Body,

			\MailSo\Mime\Enumerations\Constants::CRLF
		);

		if (0 < $this->SubParts->Count())
		{
			$sBoundary = $this->HeaderBoundary();
			if (0 < strlen($sBoundary))
			{
				$aSubStreams[] = '--'.$sBoundary.\MailSo\Mime\Enumerations\Constants::CRLF;

				$rSubPartsStream = $this->SubParts->ToStream($sBoundary);
				if (is_resource($rSubPartsStream))
				{
					$aSubStreams[] = $rSubPartsStream;
				}

				$aSubStreams[] = \MailSo\Mime\Enumerations\Constants::CRLF.
					'--'.$sBoundary.'--'.\MailSo\Mime\Enumerations\Constants::CRLF;
			}
		}

		return \MailSo\Base\StreamWrappers\SubStreams::CreateStream($aSubStreams);
	}
}
