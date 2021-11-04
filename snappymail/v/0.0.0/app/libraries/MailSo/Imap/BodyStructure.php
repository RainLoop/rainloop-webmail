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

	function __construct(string $sContentType, ?string $sCharset, array $aBodyParams, ?string $sContentID,
		?string $sDescription, ?string $sMailEncodingName, ?string $sDisposition, ?array $aDispositionParams, string $sFileName,
		?string $sLanguage, ?string $sLocation, int $iSize, int $iTextLineCount, string $sPartID, array $aSubParts)
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

	public function MailEncodingName() : ?string
	{
		return $this->sMailEncodingName;
	}

	public function PartID() : string
	{
		return (string) $this->sPartID;
	}

	public function FileName() : string
	{
		return $this->sFileName;
	}

	public function ContentType() : string
	{
		return $this->sContentType;
	}

	public function Size() : int
	{
		return $this->iSize;
	}

	public function EstimatedSize() : int
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

	public function Charset() : ?string
	{
		return $this->sCharset;
	}

	public function ContentID() : string
	{
		return (null === $this->sContentID) ? '' : $this->sContentID;
	}

	public function ContentLocation() : string
	{
		return (null === $this->sLocation) ? '' : $this->sLocation;
	}

	public function IsInline() : bool
	{
		return (null === $this->sDisposition) ?
			(0 < \strlen($this->ContentID())) : ('inline' === strtolower($this->sDisposition));
	}

	public function IsImage() : bool
	{
		return 'image' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	public function IsArchive() : bool
	{
		return 'archive' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	public function IsPdf() : bool
	{
		return 'pdf' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	public function IsDoc() : bool
	{
		return 'doc' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	public function IsPgpSignature() : bool
	{
		return \in_array(\strtolower($this->ContentType()),
			array('application/pgp-signature', 'application/pkcs7-signature'));
	}

	public function IsAttachBodyPart() : bool
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

	public function IsFlowedFormat() : bool
	{
		$bResult = !empty($this->aBodyParams['format']) &&
			'flowed' === \strtolower(\trim($this->aBodyParams['format']));

		if ($bResult && \in_array(\strtolower($this->MailEncodingName()), array('base64', 'quoted-printable')))
		{
			$bResult = false;
		}

		return $bResult;
	}

	public function SearchPlainParts() : array
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

	public function SearchHtmlParts() : array
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

	public function SearchInlineEncryptedPart() : ?self
	{
		if ('multipart/encrypted' === \strtolower($this->ContentType()))
		{
			$aSearchParts = $this->SearchByCallback(function ($oItem) {
				return $oItem->IsInline();
			});

			if (1 === \count($aSearchParts) && isset($aSearchParts[0]))
			{
				return $aSearchParts[0];
			}
		}

		return null;
	}

	public function SearchHtmlOrPlainParts() : array
	{
		$mResult = $this->SearchHtmlParts() ?: $this->SearchPlainParts();
		if (!$mResult)
		{
			$oPart = $this->SearchInlineEncryptedPart();
			if ($oPart instanceof self)
			{
				$mResult = array($oPart);
			}
		}

		return $mResult;
	}

	public function SearchCharset() : string
	{
		$sResult = '';
		$mParts = \array_merge($this->SearchHtmlParts(), $this->SearchPlainParts());

		foreach ($mParts as $oPart)
		{
			$sResult = $oPart ? $oPart->Charset() : '';
			if ($sResult)
			{
				break;
			}
		}

		if (!$sResult)
		{
			$aParts = $this->SearchAttachmentsParts();
			foreach ($aParts as $oPart)
			{
				$sResult = $oPart ? $oPart->Charset() : '';
				if ($sResult)
				{
					break;
				}
			}
		}

		return $sResult ?: '';
	}

	/**
	 * @param mixed $fCallback
	 */
	public function SearchByCallback($fCallback) : array
	{
		$aReturn = array();
		if (\call_user_func($fCallback, $this))
		{
			$aReturn[] = $this;
		}

		foreach ($this->aSubParts as /* @var $oSubPart \MailSo\Imap\BodyStructure */ $oSubPart)
		{
			$aReturn = \array_merge($aReturn, $oSubPart->SearchByCallback($fCallback));
		}

		return $aReturn;
	}

	public function SearchAttachmentsParts() : array
	{
		return $this->SearchByCallback(function ($oItem) {
			return $oItem->IsAttachBodyPart();
		});
	}

	public function SearchByContentType(string $sContentType) : array
	{
		$sContentType = \strtolower($sContentType);
		return $this->SearchByCallback(function ($oItem) use ($sContentType) {
			return $sContentType === $oItem->ContentType();
		});
	}

	public function GetPartByMimeIndex(string $sMimeIndex) : self
	{
		$oPart = null;
		if (0 < \strlen($sMimeIndex))
		{
			if ($sMimeIndex === $this->sPartID)
			{
				$oPart = $this;
			}

			if (null === $oPart)
			{
				foreach ($this->aSubParts as /* @var $oSubPart \MailSo\Imap\BodyStructure */ $oSubPart)
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

	private static function decodeAttrParameter(array $aParams, string $sParamName, string $sCharset = \MailSo\Base\Enumerations\Charset::UTF_8) : string
	{
		$sResult = '';
		if (isset($aParams[$sParamName]))
		{
			$sResult = \MailSo\Base\Utils::DecodeHeaderValue($aParams[$sParamName], $sCharset);
		}
		else if (isset($aParams[$sParamName.'*']))
		{
			$aValueParts = \explode("''", $aParams[$sParamName.'*'], 2);
			if (2 === \count($aValueParts))
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
						if (2 === \count($aValueParts) && 0 < \strlen($aValueParts[0]))
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

	public static function NewInstance(array $aBodyStructure, string $sPartID = '') : ?self
	{
		if (2 > \count($aBodyStructure))
		{
			return null;
		}

		$sBodyMainType = null;
		if (\is_string($aBodyStructure[0]))
		{
			$sBodyMainType = $aBodyStructure[0];
		}

		$sBodySubType = null;
		$sContentType = '';
		$aSubParts = array();
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

			$iIndex = 1;

			while ($iExtraItemPos < \count($aBodyStructure) && \is_array($aBodyStructure[$iExtraItemPos]))
			{
				$oPart = self::NewInstance($aBodyStructure[$iExtraItemPos], $sSubPartIDPrefix.$iIndex);
				if (null === $oPart)
				{
					return null;
				}

				// For multipart, we have no charset info in the part itself. Thus,
				// obtain charset from nested parts.
				if ($sCharset == null)
				{
					$sCharset = $oPart->Charset();
				}

				$aSubParts[] = $oPart;
				++$iExtraItemPos;
				++$iIndex;
			}

			if ($iExtraItemPos < \count($aBodyStructure))
			{
				if (!\is_string($aBodyStructure[$iExtraItemPos]))
				{
					return null;
				}

				$sBodySubType = \strtolower($aBodyStructure[$iExtraItemPos]);
				++$iExtraItemPos;
			}

			if ($iExtraItemPos < \count($aBodyStructure))
			{
				$sBodyParamList = $aBodyStructure[$iExtraItemPos];
				if (\is_array($sBodyParamList))
				{
					$aBodyParams = self::getKeyValueListFromArrayList($sBodyParamList);
				}
			}

			++$iExtraItemPos;
		}
		else
		{
			// Process simple (singlepart) body structure
			if (7 > \count($aBodyStructure))
			{
				return null;
			}

			$sBodyMainType = \strtolower($sBodyMainType);
			if (!\is_string($aBodyStructure[1]))
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

				$sName = self::decodeAttrParameter($aBodyParams, 'name', $sContentType);
			}

			if (null !== $aBodyStructure[3])
			{
				if (!\is_string($aBodyStructure[3]))
				{
					return null;
				}

				$sContentID = $aBodyStructure[3];
			}

			if (null !== $aBodyStructure[4])
			{
				if (!\is_string($aBodyStructure[4]))
				{
					return null;
				}

				$sDescription = $aBodyStructure[4];
			}

			if (null !== $aBodyStructure[5])
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

				++$iExtraItemPos;
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

			++$iExtraItemPos; // skip MD5 digest of the body because most mail servers leave it NIL anyway
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
					if (\is_string($aDispList[0]))
					{
						$sDisposition = $aDispList[0];
					}
					else
					{
						return null;
					}
				}

				$aDispParamList = $aDispList[1];
				if (\is_array($aDispParamList))
				{
					$aDispositionParams = self::getKeyValueListFromArrayList($aDispParamList);
					$sFileName = self::decodeAttrParameter($aDispositionParams, 'filename', $sCharset ?: '');
				}
			}
		}

		++$iExtraItemPos;

		$sLanguage = null;
		if ($iExtraItemPos < \count($aBodyStructure))
		{
			if (null !== $aBodyStructure[$iExtraItemPos])
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
			++$iExtraItemPos;
		}

		$sLocation = null;
		if ($iExtraItemPos < \count($aBodyStructure))
		{
			if (null !== $aBodyStructure[$iExtraItemPos])
			{
				if (\is_string($aBodyStructure[$iExtraItemPos]))
				{
					$sLocation = $aBodyStructure[$iExtraItemPos];
				}
			}
			++$iExtraItemPos;
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
			\MailSo\Base\Utils::Utf8Clear($sFileName ?: $sName),
			$sLanguage,
			$sLocation,
			$iSize,
			$iTextLineCount,
			$sPartID,
			$aSubParts
		);
	}

	public static function NewInstanceFromRfc822SubPart(array $aBodyStructure, string $sSubPartID) : ?self
	{
		$aBodySubStructure = self::findPartByIndexInArray($aBodyStructure, $sSubPartID);
		if ($aBodySubStructure && \is_array($aBodySubStructure) && isset($aBodySubStructure[8]))
		{
			return self::NewInstance($aBodySubStructure[8], $sSubPartID);
		}

		return null;
	}

	private static function findPartByIndexInArray(array $aList, string $sPartID) : ?array
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
	 */
	private static function getKeyValueListFromArrayList(array $aList) : array
	{
		$aDict = array();
		$iLen = \count($aList);
		if (0 === ($iLen % 2))
		{
			for ($iIndex = 0; $iIndex < $iLen; $iIndex += 2)
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
