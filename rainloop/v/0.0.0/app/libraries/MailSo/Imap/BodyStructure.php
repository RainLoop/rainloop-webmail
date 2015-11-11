<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Imap
 */
class BodyStructure
{
	/**
	 * @var string
	 */
	private $sContentType;

	/**
	 * @var string
	 */
	private $sCharset;

	/**
	 * @var array
	 */
	private $aBodyParams;

	/**
	 * @var string
	 */
	private $sContentID;

	/**
	 * @var string
	 */
	private $sDescription;

	/**
	 * @var string
	 */
	private $sMailEncodingName;

	/**
	 * @var string
	 */
	private $sDisposition;

	/**
	 * @var array
	 */
	private $aDispositionParams;

	/**
	 * @var string
	 */
	private $sFileName;

	/**
	 * @var string
	 */
	private $sLanguage;

	/**
	 * @var string
	 */
	private $sLocation;

	/**
	 * @var int
	 */
	private $iSize;

	/**
	 * @var int
	 */
	private $iTextLineCount;

	/**
	 * @var string
	 */
	private $sPartID;

	/**
	 * @var array
	 */
	private $aSubParts;

	/**
	 * @access private
	 *
	 * @param string $sContentType
	 * @param string $sCharset
	 * @param array $aBodyParams
	 * @param string $sContentID
	 * @param string $sDescription
	 * @param string $sMailEncodingName
	 * @param string $sDisposition
	 * @param array $aDispositionParams
	 * @param string $sFileName
	 * @param string $sLanguage
	 * @param string $sLocation
	 * @param int $iSize
	 * @param int $iTextLineCount
	 * @param string $sPartID
	 * @param array $aSubParts
	 */
	private function __construct($sContentType, $sCharset, $aBodyParams, $sContentID,
		$sDescription, $sMailEncodingName, $sDisposition, $aDispositionParams, $sFileName,
		$sLanguage, $sLocation, $iSize, $iTextLineCount, $sPartID, $aSubParts)
	{
		$this->sContentType = $sContentType;
		$this->sCharset = $sCharset;
		$this->aBodyParams = $aBodyParams;
		$this->sContentID = $sContentID;
		$this->sDescription = $sDescription;
		$this->sMailEncodingName = $sMailEncodingName;
		$this->sDisposition = $sDisposition;
		$this->aDispositionParams = $aDispositionParams;
		$this->sFileName = $sFileName;
		$this->sLanguage = $sLanguage;
		$this->sLocation = $sLocation;
		$this->iSize = $iSize;
		$this->iTextLineCount = $iTextLineCount;
		$this->sPartID = $sPartID;
		$this->aSubParts = $aSubParts;
	}

	/**
	 * return string
	 */
	public function MailEncodingName()
	{
		return $this->sMailEncodingName;
	}

	/**
	 * return string
	 */
	public function PartID()
	{
		return (string) $this->sPartID;
	}

	/**
	 * return string
	 */
	public function FileName()
	{
		return $this->sFileName;
	}

	/**
	 * return string
	 */
	public function ContentType()
	{
		return $this->sContentType;
	}

	/**
	 * return int
	 */
	public function Size()
	{
		return (int) $this->iSize;
	}

	/**
	 * return int
	 */
	public function EstimatedSize()
	{
		$fCoefficient = 1;
		switch (\strtolower($this->MailEncodingName()))
		{
			case 'base64':
				$fCoefficient = 0.75;
				break;
			case 'quoted-printable':
				$fCoefficient = 0.44;
				break;
		}

		return (int) ($this->Size() * $fCoefficient);
	}

	/**
	 * return string
	 */
	public function Charset()
	{
		return $this->sCharset;
	}


	/**
	 * return string
	 */
	public function ContentID()
	{
		return (null === $this->sContentID) ? '' : $this->sContentID;
	}

	/**
	 * return string
	 */
	public function ContentLocation()
	{
		return (null === $this->sLocation) ? '' : $this->sLocation;
	}

	/**
	 * return bool
	 */
	public function IsInline()
	{
		return (null === $this->sDisposition) ?
			(0 < \strlen($this->ContentID())) : ('inline' === strtolower($this->sDisposition));
	}

	/**
	 * return bool
	 */
	public function IsImage()
	{
		return 'image' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	/**
	 * return bool
	 */
	public function IsArchive()
	{
		return 'archive' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	/**
	 * @return bool
	 */
	public function IsPdf()
	{
		return 'pdf' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	/**
	 * @return bool
	 */
	public function IsDoc()
	{
		return 'doc' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	/**
	 * @return bool
	 */
	public function IsPgpSignature()
	{
		return \in_array(\strtolower($this->ContentType()),
			array('application/pgp-signature', 'application/pkcs7-signature'));
	}

	/**
	 * @return bool
	 */
	public function IsAttachBodyPart()
	{
		$bResult = (
			(null !== $this->sDisposition && 'attachment' === \strtolower($this->sDisposition))
		);

		if (!$bResult && null !== $this->sContentType)
		{
			$sContentType = \strtolower($this->sContentType);
			$bResult = false === \strpos($sContentType, 'multipart/') &&
				'text/html' !== $sContentType && 'text/plain' !== $sContentType;
		}

		return $bResult;
	}

	/**
	 * @return bool
	 */
	public function IsFlowedFormat()
	{
		$bResult = !empty($this->aBodyParams['format']) &&
			'flowed' === \strtolower(\trim($this->aBodyParams['format']));

		if ($bResult && \in_array(\strtolower($this->MailEncodingName()), array('base64', 'quoted-printable')))
		{
			$bResult = false;
		}

		return $bResult;
	}

	/**
	 * @return array|null
	 */
	public function SearchPlainParts()
	{
		$aReturn = array();
		$aParts = $this->SearchByContentType('text/plain');
		foreach ($aParts as $oPart)
		{
			if (!$oPart->IsAttachBodyPart())
			{
				$aReturn[] = $oPart;
			}
		}
		return $aReturn;
	}

	/**
	 * @return array|null
	 */
	public function SearchHtmlParts()
	{
		$aReturn = array();
		$aParts = $this->SearchByContentType('text/html');

		foreach ($aParts as $oPart)
		{
			if (!$oPart->IsAttachBodyPart())
			{
				$aReturn[] = $oPart;
			}
		}

		return $aReturn;
	}

	/**
	 * @return \MailSo\Imap\BodyStructure|null
	 */
	public function SearchInlineEncryptedPart()
	{
		if ('multipart/encrypted' === \strtolower($this->ContentType()))
		{
			$aSearchParts = $this->SearchByCallback(function ($oItem) {
				return $oItem->IsInline();
			});

			if (is_array($aSearchParts) && 1 === \count($aSearchParts) && isset($aSearchParts[0]))
			{
				return $aSearchParts[0];
			}
		}

		return null;
	}

	/**
	 * @return array|null
	 */
	public function SearchHtmlOrPlainParts()
	{
		$mResult = $this->SearchHtmlParts();
		if (null === $mResult || (\is_array($mResult) && 0 === count($mResult)))
		{
			$mResult = $this->SearchPlainParts();
		}

		if (null === $mResult || (\is_array($mResult) && 0 === count($mResult)))
		{
			$oPart = $this->SearchInlineEncryptedPart();
			if ($oPart instanceof \MailSo\Imap\BodyStructure)
			{
				$mResult = array($oPart);
			}
		}

		return $mResult;
	}

	/**
	 * @return string
	 */
	public function SearchCharset()
	{
		$sResult = '';
		$mParts = array();

		$mHtmlParts = $this->SearchHtmlParts();
		$mPlainParts = $this->SearchPlainParts();

		if (\is_array($mHtmlParts) && 0 < \count($mHtmlParts))
		{
			$mParts = \array_merge($mParts, $mHtmlParts);
		}

		if (\is_array($mPlainParts) && 0 < \count($mPlainParts))
		{
			$mParts = \array_merge($mParts, $mPlainParts);
		}

		foreach ($mParts as $oPart)
		{
			$sResult = $oPart ? $oPart->Charset() : '';
			if (!empty($sResult))
			{
				break;
			}
		}

		if (0 === strlen($sResult))
		{
			$aParts = $this->SearchAttachmentsParts();
			foreach ($aParts as $oPart)
			{
				if (0 === \strlen($sResult))
				{
					$sResult = $oPart ? $oPart->Charset() : '';
				}
				else
				{
					break;
				}
			}
		}

		return $sResult;
	}

	/**
	 * @param mixed $fCallback
	 *
	 * @return array
	 */
	public function SearchByCallback($fCallback)
	{
		$aReturn = array();
		if (\call_user_func($fCallback, $this))
		{
			$aReturn[] = $this;
		}

		if (\is_array($this->aSubParts) && 0 < \count($this->aSubParts))
		{
			foreach ($this->aSubParts as /* @var $oSubPart \MailSo\Imap\BodyStructure */ &$oSubPart)
			{
				$aReturn = \array_merge($aReturn, $oSubPart->SearchByCallback($fCallback));
			}
		}

		return $aReturn;
	}

	/**
	 * @return array
	 */
	public function SearchAttachmentsParts()
	{
		return $this->SearchByCallback(function ($oItem) {
			return $oItem->IsAttachBodyPart();
		});
	}

	/**
	 * @param string $sContentType
	 *
	 * @return array
	 */
	public function SearchByContentType($sContentType)
	{
		$sContentType = \strtolower($sContentType);
		return $this->SearchByCallback(function ($oItem) use ($sContentType) {
			return $sContentType === $oItem->ContentType();
		});
	}

	/**
	 * @param string $sMimeIndex
	 *
	 * @return \MailSo\Imap\BodyStructure
	 */
	public function GetPartByMimeIndex($sMimeIndex)
	{
		$oPart = null;
		if (0 < \strlen($sMimeIndex))
		{
			if ($sMimeIndex === $this->sPartID)
			{
				$oPart = $this;
			}

			if (null === $oPart && is_array($this->aSubParts) && 0 < count($this->aSubParts))
			{
				foreach ($this->aSubParts as /* @var $oSubPart \MailSo\Imap\BodyStructure */ &$oSubPart)
				{
					$oPart = $oSubPart->GetPartByMimeIndex($sMimeIndex);
					if (null !== $oPart)
					{
						break;
					}
				}
			}
		}

		return $oPart;
	}

	/**
	 * @param array $aParams
	 * @param string $sParamName
	 * @param string $sCharset = \MailSo\Base\Enumerations\Charset::UTF_8
	 *
	 * @return string
	 */
	private static function decodeAttrParamenter($aParams, $sParamName, $sCharset = \MailSo\Base\Enumerations\Charset::UTF_8)
	{
		$sResult = '';
		if (isset($aParams[$sParamName]))
		{
			$sResult = \MailSo\Base\Utils::DecodeHeaderValue($aParams[$sParamName], $sCharset);
		}
		else if (isset($aParams[$sParamName.'*']))
		{
			$aValueParts = \explode("''", $aParams[$sParamName.'*'], 2);
			if (\is_array($aValueParts) && 2 === \count($aValueParts))
			{
				$sCharset = isset($aValueParts[0]) ? $aValueParts[0] : \MailSo\Base\Enumerations\Charset::UTF_8;

				$sResult = \MailSo\Base\Utils::ConvertEncoding(
					\urldecode($aValueParts[1]), $sCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
			}
			else
			{
				$sResult = \urldecode($aParams[$sParamName.'*']);
			}
		}
		else
		{
			$sCharset = '';
			$sCharsetIndex = -1;

			$aFileNames = array();
			foreach ($aParams as $sName => $sValue)
			{
				$aMatches = array();
				if (\preg_match('/^'.\preg_quote($sParamName, '/').'\*([0-9]+)\*$/i', $sName, $aMatches))
				{
					$iIndex = (int) $aMatches[1];
					if ($sCharsetIndex < $iIndex && false !== \strpos($sValue, "''"))
					{
						$aValueParts = \explode("''", $sValue, 2);
						if (\is_array($aValueParts) && 2 === \count($aValueParts) && 0 < \strlen($aValueParts[0]))
						{
							$sCharsetIndex = $iIndex;
							$sCharset = $aValueParts[0];
							$sValue = $aValueParts[1];
						}
					}

					$aFileNames[$iIndex] = $sValue;
				}
			}

			if (0 < \count($aFileNames))
			{
				\ksort($aFileNames, SORT_NUMERIC);
				$sResult = \implode(\array_values($aFileNames));
				$sResult = \urldecode($sResult);

				if (0 < \strlen($sCharset))
				{
					$sResult = \MailSo\Base\Utils::ConvertEncoding($sResult,
						$sCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
				}
			}
		}

		return $sResult;
	}

	/**
	 * @param array $aBodyStructure
	 * @param string $sPartID = ''
	 *
	 * @return \MailSo\Imap\BodyStructure
	 */
	public static function NewInstance(array $aBodyStructure, $sPartID = '')
	{
		if (!\is_array($aBodyStructure) || 2 > \count($aBodyStructure))
		{
			return null;
		}
		else
		{
			$sBodyMainType = null;
			if (\is_string($aBodyStructure[0]) && 'NIL' !== $aBodyStructure[0])
			{
				$sBodyMainType = $aBodyStructure[0];
			}

			$sBodySubType = null;
			$sContentType = '';
			$aSubParts = null;
			$aBodyParams = array();
			$sName = null;
			$sCharset = null;
			$sContentID = null;
			$sDescription = null;
			$sMailEncodingName = null;
			$iSize = 0;
			$iTextLineCount = 0; // valid for rfc822/message and text parts
			$iExtraItemPos = 0;  // list index of items which have no well-established position (such as 0, 1, 5, etc).

			if (null === $sBodyMainType)
			{
				// Process multipart body structure
				if (!\is_array($aBodyStructure[0]))
				{
					return null;
				}
				else
				{
					$sBodyMainType = 'multipart';
					$sSubPartIDPrefix = '';
					if (0 === \strlen($sPartID) || '.' === $sPartID[\strlen($sPartID) - 1])
					{
						// This multi-part is root part of message.
						$sSubPartIDPrefix = $sPartID;
						$sPartID .= 'TEXT';
					}
					else if (0 < \strlen($sPartID))
					{
						// This multi-part is a part of another multi-part.
						$sSubPartIDPrefix = $sPartID.'.';
					}

					$aSubParts = array();
					$iIndex = 1;

					while ($iExtraItemPos < \count($aBodyStructure) && \is_array($aBodyStructure[$iExtraItemPos]))
					{
						$oPart = self::NewInstance($aBodyStructure[$iExtraItemPos], $sSubPartIDPrefix.$iIndex);
						if (null === $oPart)
						{
							return null;
						}
						else
						{
							// For multipart, we have no charset info in the part itself. Thus,
							// obtain charset from nested parts.
							if ($sCharset == null)
							{
								$sCharset = $oPart->Charset();
							}

							$aSubParts[] = $oPart;
							$iExtraItemPos++;
							$iIndex++;
						}
					}
				}

				if ($iExtraItemPos < \count($aBodyStructure))
				{
					if (!\is_string($aBodyStructure[$iExtraItemPos]) || 'NIL' === $aBodyStructure[$iExtraItemPos])
					{
						return null;
					}

					$sBodySubType = \strtolower($aBodyStructure[$iExtraItemPos]);
					$iExtraItemPos++;
				}

				if ($iExtraItemPos < \count($aBodyStructure))
				{
					$sBodyParamList = $aBodyStructure[$iExtraItemPos];
					if (\is_array($sBodyParamList))
					{
						$aBodyParams = self::getKeyValueListFromArrayList($sBodyParamList);
					}
				}

				$iExtraItemPos++;
			}
			else
			{
				// Process simple (singlepart) body structure
				if (7 > \count($aBodyStructure))
				{
					return null;
				}

				$sBodyMainType = \strtolower($sBodyMainType);
				if (!\is_string($aBodyStructure[1]) || 'NIL' === $aBodyStructure[1])
				{
					return null;
				}

				$sBodySubType = \strtolower($aBodyStructure[1]);

				$aBodyParamList = $aBodyStructure[2];
				if (\is_array($aBodyParamList))
				{
					$aBodyParams = self::getKeyValueListFromArrayList($aBodyParamList);
					if (isset($aBodyParams['charset']))
					{
						$sCharset = $aBodyParams['charset'];
					}

					if (\is_array($aBodyParams))
					{
						$sName = self::decodeAttrParamenter($aBodyParams, 'name', $sContentType);
					}
				}

				if (null !== $aBodyStructure[3] && 'NIL' !== $aBodyStructure[3])
				{
					if (!\is_string($aBodyStructure[3]))
					{
						return null;
					}

					$sContentID = $aBodyStructure[3];
				}

				if (null !== $aBodyStructure[4] && 'NIL' !== $aBodyStructure[4])
				{
					if (!\is_string($aBodyStructure[4]))
					{
						return null;
					}

					$sDescription = $aBodyStructure[4];
				}

				if (null !== $aBodyStructure[5] && 'NIL' !== $aBodyStructure[5])
				{
					if (!\is_string($aBodyStructure[5]))
					{
						return null;
					}
					$sMailEncodingName = $aBodyStructure[5];
				}

				if (\is_numeric($aBodyStructure[6]))
				{
					$iSize = (int) $aBodyStructure[6];
				}
				else
				{
					$iSize = -1;
				}

				if (0 === \strlen($sPartID) || '.' === $sPartID[\strlen($sPartID) - 1])
				{
					// This is the only sub-part of the message (otherwise, it would be
					// one of sub-parts of a multi-part, and partID would already be fully set up).
					$sPartID .= '1';
				}

				$iExtraItemPos = 7;
				if ('text' === $sBodyMainType)
				{
					if ($iExtraItemPos < \count($aBodyStructure))
					{
						if (\is_numeric($aBodyStructure[$iExtraItemPos]))
						{
							$iTextLineCount = (int) $aBodyStructure[$iExtraItemPos];
						}
						else
						{
							$iTextLineCount = -1;
						}
					}
					else
					{
						$iTextLineCount = -1;
					}

					$iExtraItemPos++;
				}
				else if ('message' === $sBodyMainType && 'rfc822' === $sBodySubType)
				{
					if ($iExtraItemPos + 2 < \count($aBodyStructure))
					{
						if (\is_numeric($aBodyStructure[$iExtraItemPos + 2]))
						{
							$iTextLineCount = (int) $aBodyStructure[$iExtraItemPos + 2];
						}
						else
						{
							$iTextLineCount = -1;
						}
					}
					else
					{
						$iTextLineCount = -1;
					}

					$iExtraItemPos += 3;
				}

				$iExtraItemPos++;	// skip MD5 digest of the body because most mail servers leave it NIL anyway
			}

			$sContentType = $sBodyMainType.'/'.$sBodySubType;

			$sDisposition = null;
			$aDispositionParams = null;
			$sFileName = null;

			if ($iExtraItemPos < \count($aBodyStructure))
			{
				$aDispList = $aBodyStructure[$iExtraItemPos];
				if (\is_array($aDispList) && 1 < \count($aDispList))
				{
					if (null !== $aDispList[0])
					{
						if (\is_string($aDispList[0]) && 'NIL' !== $aDispList[0])
						{
							$sDisposition = $aDispList[0];
						}
						else
						{
							return null;
						}
					}
				}

				$aDispParamList = $aDispList[1];
				if (\is_array($aDispParamList))
				{
					$aDispositionParams = self::getKeyValueListFromArrayList($aDispParamList);
					if (\is_array($aDispositionParams))
					{
						$sFileName = self::decodeAttrParamenter($aDispositionParams, 'filename', $sCharset);
					}
				}
			}

			$iExtraItemPos++;

			$sLanguage = null;
			if ($iExtraItemPos < count($aBodyStructure))
			{
				if (null !== $aBodyStructure[$iExtraItemPos] && 'NIL' !== $aBodyStructure[$iExtraItemPos])
				{
					if (\is_array($aBodyStructure[$iExtraItemPos]))
					{
						$sLanguage = \implode(',', $aBodyStructure[$iExtraItemPos]);
					}
					else if (\is_string($aBodyStructure[$iExtraItemPos]))
					{
						$sLanguage = $aBodyStructure[$iExtraItemPos];
					}
				}
				$iExtraItemPos++;
			}

			$sLocation = null;
			if ($iExtraItemPos < \count($aBodyStructure))
			{
				if (null !== $aBodyStructure[$iExtraItemPos] && 'NIL' !== $aBodyStructure[$iExtraItemPos])
				{
					if (\is_string($aBodyStructure[$iExtraItemPos]))
					{
						$sLocation = $aBodyStructure[$iExtraItemPos];
					}
				}
				$iExtraItemPos++;
			}

			return new self(
				$sContentType,
				$sCharset,
				$aBodyParams,
				$sContentID,
				$sDescription,
				$sMailEncodingName,
				$sDisposition,
				$aDispositionParams,
				\MailSo\Base\Utils::Utf8Clear((null === $sFileName || 0 === \strlen($sFileName)) ? $sName : $sFileName),
				$sLanguage,
				$sLocation,
				$iSize,
				$iTextLineCount,
				$sPartID,
				$aSubParts
			);
		}
	}

	/**
	 * @param array $aBodyStructure
	 * @param string $sSubPartID
	 *
	 * @return \MailSo\Imap\BodyStructure|null
	 */
	public static function NewInstanceFromRfc822SubPart(array $aBodyStructure, $sSubPartID)
	{
		$oBody = null;
		$aBodySubStructure = self::findPartByIndexInArray($aBodyStructure, $sSubPartID);
		if ($aBodySubStructure && \is_array($aBodySubStructure) && isset($aBodySubStructure[8]))
		{
			$oBody = self::NewInstance($aBodySubStructure[8], $sSubPartID);
		}

		return $oBody;
	}

	/**
	 * @param array $aList
	 * @param string $sPartID
	 *
	 * @return array|null
	 */
	private static function findPartByIndexInArray(array $aList, $sPartID)
	{
		$bFind = false;
		$aPath = \explode('.', ''.$sPartID);
		$aCurrentPart = $aList;

		foreach ($aPath as $iPos => $iNum)
		{
			$iIndex = \intval($iNum) - 1;
			if (0 <= $iIndex && 0 < $iPos ? isset($aCurrentPart[8][$iIndex]) : isset($aCurrentPart[$iIndex]))
			{
				$aCurrentPart = 0 < $iPos ? $aCurrentPart[8][$iIndex] : $aCurrentPart[$iIndex];
				$bFind = true;
			}
		}

		return $bFind ? $aCurrentPart : null;
	}

	/**
	 * Returns dict with key="charset" and value="US-ASCII" for array ("CHARSET" "US-ASCII").
	 * Keys are lowercased (StringDictionary itself does this), values are not altered.
	 *
	 * @param array $aList
	 *
	 * @return array
	 */
	private static function getKeyValueListFromArrayList(array $aList)
	{
		$aDict = null;
		if (0 === \count($aList) % 2)
		{
			$aDict = array();
			for ($iIndex = 0, $iLen = \count($aList); $iIndex < $iLen; $iIndex += 2)
			{
				if (\is_string($aList[$iIndex]) && isset($aList[$iIndex + 1]) && \is_string($aList[$iIndex + 1]))
				{
					$aDict[\strtolower($aList[$iIndex])] = $aList[$iIndex + 1];
				}
			}
		}

		return $aDict;
	}
}
