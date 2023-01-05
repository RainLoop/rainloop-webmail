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

use MailSo\Mime\ParameterCollection;

/**
 * @category MailSo
 * @package Imap
 */
class BodyStructure
{
	private string $sContentType;

	private array $aContentTypeParams;

	private string $sCharset;

	private string $sContentID;

	private string $sDescription;

	private string $sMailEncodingName;

	private string $sDisposition;

	private string $sFileName;

	private string $sLanguage = '';

	private string $sLocation = '';

	private int $iSize;

	private string $sPartID;

	private array $aSubParts;

	public function MailEncodingName() : string
	{
		return $this->sMailEncodingName;
	}

	public function PartID() : string
	{
		return $this->sPartID;
	}

	public function FileName() : string
	{
		return $this->sFileName;
	}

	public function ContentType() : string
	{
		return $this->sContentType;
	}

	public function ContentTypeParameters() : array
	{
		return $this->aContentTypeParams;
	}

	public function Size() : int
	{
		return $this->iSize;
	}

	public function EstimatedSize() : int
	{
		$fCoefficient = 1;
		switch ($this->sMailEncodingName)
		{
			case 'base64':
				$fCoefficient = 0.75;
				break;
			case 'quoted-printable':
				$fCoefficient = 0.44;
				break;
		}

		return (int) ($this->iSize * $fCoefficient);
	}

	public function Charset() : string
	{
		return $this->sCharset;
	}

	public function ContentID() : string
	{
		return $this->sContentID;
	}

	public function ContentLocation() : string
	{
		return $this->sLocation;
	}

	public function SubParts() : array
	{
		return $this->aSubParts;
	}

	public function IsInline() : bool
	{
		return 'inline' === $this->sDisposition || \strlen($this->sContentID);
	}

	public function IsImage() : bool
	{
		return 'image' === \MailSo\Base\Utils::ContentTypeType($this->sContentType, $this->sFileName);
	}

	public function IsArchive() : bool
	{
		return 'archive' === \MailSo\Base\Utils::ContentTypeType($this->sContentType, $this->sFileName);
	}

	public function IsPdf() : bool
	{
		return 'pdf' === \MailSo\Base\Utils::ContentTypeType($this->sContentType, $this->sFileName);
	}

	public function IsDoc() : bool
	{
		return 'doc' === \MailSo\Base\Utils::ContentTypeType($this->sContentType, $this->sFileName);
	}

	public function IsPgpEncrypted() : bool
	{
		// https://datatracker.ietf.org/doc/html/rfc3156#section-4
		return 'multipart/encrypted' === $this->sContentType
		 && !empty($this->aContentTypeParams['protocol'])
		 && 'application/pgp-encrypted' === \strtolower(\trim($this->aContentTypeParams['protocol']))
		 // The multipart/encrypted body MUST consist of exactly two parts.
		 && 2 === \count($this->aSubParts)
		 && 'application/pgp-encrypted' === $this->aSubParts[0]->ContentType()
		 && 'application/octet-stream' === $this->aSubParts[1]->ContentType();
//		 && 'Version: 1' === $this->aSubParts[0]->Body()
	}

	public function IsPgpSigned() : bool
	{
		// https://datatracker.ietf.org/doc/html/rfc3156#section-5
		return 'multipart/signed' === $this->sContentType
		 && !empty($this->aContentTypeParams['protocol'])
		 && 'application/pgp-signature' === \strtolower(\trim($this->aContentTypeParams['protocol']))
		 // The multipart/signed body MUST consist of exactly two parts.
		 && 2 === \count($this->aSubParts)
		 && $this->aSubParts[1]->IsPgpSignature();
	}

	public function IsPgpSignature() : bool
	{
		return \in_array($this->sContentType, ['application/pgp-signature', 'application/pkcs7-signature']);
	}

	public function IsAttachBodyPart() : bool
	{
		return 'application/pgp-encrypted' !== $this->sContentType
		 && (
			'attachment' === $this->sDisposition || (
				!\str_starts_with($this->sContentType, 'multipart/')
				&& 'text/html' !== $this->sContentType
				&& 'text/plain' !== $this->sContentType
			)
		);
	}

	public function IsFlowedFormat() : bool
	{
		return !empty($this->aContentTypeParams['format'])
			&& 'flowed' === \strtolower(\trim($this->aContentTypeParams['format']))
			&& !\in_array($this->sMailEncodingName, array('base64', 'quoted-printable'));
	}

	public function GetHtmlAndPlainParts() : array
	{
		$aParts = [];

		$gParts = $this->SearchByCallback(function ($oItem) {
			return ('text/html' === $oItem->sContentType || 'text/plain' === $oItem->sContentType)
				&& !$oItem->IsAttachBodyPart();
		});
		foreach ($gParts as $oPart) {
			$aParts[] = $oPart;
		}

		/**
		 * No text found, is it encrypted?
		 * If so, just return that.
		 */
		if (!$aParts) {
			$gEncryptedParts = $this->SearchByContentType('multipart/encrypted');
			foreach ($gEncryptedParts as $oPart) {
				if ($oPart->IsPgpEncrypted() && $oPart->SubParts()[1]->IsInline()) {
					return array($oPart->SubParts()[1]);
				}
			}
		}

		return $aParts;
	}

	public function SearchCharset() : string
	{
		$gParts = $this->SearchByCallback(function ($oPart) {
			return $oPart->Charset()
				&& ('text/html' === $oPart->sContentType || 'text/plain' === $oPart->sContentType)
				&& !$oPart->IsAttachBodyPart();
		});

		if (!$gParts->valid()) {
			$gParts = $this->SearchByCallback(function ($oPart) {
				return $oPart->Charset() && $oPart->IsAttachBodyPart();
			});
		}

		return $gParts->valid() ? $gParts->current()->Charset() : '';
	}

	/**
	 * @param mixed $fCallback
	 */
//	public function SearchByCallback($fCallback) : \Generator
	public function SearchByCallback($fCallback, $parent = null) : iterable
	{
		if ($fCallback($this, $parent)) {
			yield $this;
		}
		foreach ($this->aSubParts as /* @var $oSubPart \MailSo\Imap\BodyStructure */ $oSubPart) {
			yield from $oSubPart->SearchByCallback($fCallback, $this);
		}
	}

	public function SearchAttachmentsParts() : iterable
	{
		return $this->SearchByCallback(function ($oItem, $oParent) {
//			return $oItem->IsAttachBodyPart();
			return $oItem->IsAttachBodyPart() && (!$oParent || !$oParent->IsPgpEncrypted());
		});
	}

	public function SearchByContentType(string $sContentType) : iterable
	{
		$sContentType = \strtolower($sContentType);
		return $this->SearchByCallback(function ($oItem) use ($sContentType) {
			return $sContentType === $oItem->sContentType;
		});
	}

	public function GetPartByMimeIndex(string $sMimeIndex) : self
	{
		$oPart = null;
		if (\strlen($sMimeIndex)) {
			if ($sMimeIndex === $this->sPartID) {
				$oPart = $this;
			}

			if (null === $oPart) {
				foreach ($this->aSubParts as /* @var $oSubPart \MailSo\Imap\BodyStructure */ $oSubPart) {
					$oPart = $oSubPart->GetPartByMimeIndex($sMimeIndex);
					if (null !== $oPart) {
						break;
					}
				}
			}
		}

		return $oPart;
	}

	private static function decodeAttrParameter(array $aParams, string $sParamName, string $sCharset) : string
	{
		$sResult = '';
		if (isset($aParams[$sParamName])) {
			$sResult = \MailSo\Base\Utils::DecodeHeaderValue($aParams[$sParamName], $sCharset);
		} else if (isset($aParams[$sParamName.'*'])) {
			$aValueParts = \explode("''", $aParams[$sParamName.'*'], 2);
			if (2 === \count($aValueParts)) {
				$sCharset = isset($aValueParts[0]) ? $aValueParts[0] : \MailSo\Base\Enumerations\Charset::UTF_8;
				$sResult = \MailSo\Base\Utils::ConvertEncoding(
					\urldecode($aValueParts[1]), $sCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
			} else {
				$sResult = \urldecode($aParams[$sParamName.'*']);
			}
		} else {
			$sCharset = '';
			$sCharsetIndex = -1;

			$aFileNames = array();
			foreach ($aParams as $sName => $sValue) {
				$aMatches = array();
				if (\preg_match('/^'.\preg_quote($sParamName, '/').'\*([0-9]+)\*$/i', $sName, $aMatches)) {
					$iIndex = (int) $aMatches[1];
					if ($sCharsetIndex < $iIndex && false !== \strpos($sValue, "''")) {
						$aValueParts = \explode("''", $sValue, 2);
						if (2 === \count($aValueParts) && \strlen($aValueParts[0])) {
							$sCharsetIndex = $iIndex;
							$sCharset = $aValueParts[0];
							$sValue = $aValueParts[1];
						}
					}
					$aFileNames[$iIndex] = $sValue;
				}
			}

			if (\count($aFileNames)) {
				\ksort($aFileNames, SORT_NUMERIC);
				$sResult = \implode(\array_values($aFileNames));
				$sResult = \urldecode($sResult);
				if (\strlen($sCharset)) {
					$sResult = \MailSo\Base\Utils::ConvertEncoding($sResult,
						$sCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
				}
			}
		}

		return $sResult;
	}

	public static function NewInstance(array $aBodyStructure, string $sPartID = '') : ?self
	{
		if (2 > \count($aBodyStructure)) {
			return null;
		}

		$sContentTypeMain = '';
		$sContentTypeSub = '';
		$aSubParts = array();
		$aContentTypeParams = array();
		$sFileName = '';
		$sCharset = ''; // \MailSo\Base\Enumerations\Charset::UTF_8 ?
		$sContentID = '';
		$sDescription = '';
		$sMailEncodingName = '';
		$iSize = 0;
		$iExtraItemPos = 0;  // list index of items which have no well-established position (such as 0, 1, 5, etc).

		if (\is_array($aBodyStructure[0])) {
			// Process multipart body structure
			$sContentTypeMain = 'multipart';
			$sContentTypeSub = 'mixed'; // primary default
			$sSubPartIDPrefix = '';
			if (!\strlen($sPartID) || '.' === $sPartID[\strlen($sPartID) - 1]) {
				// This multi-part is root part of message.
				$sSubPartIDPrefix = $sPartID;
				$sPartID .= 'TEXT';
			} else if (\strlen($sPartID)) {
				// This multi-part is a part of another multi-part.
				$sSubPartIDPrefix = $sPartID.'.';
			}

			$iIndex = 1;

			/**
			 * First process the subparts, like:
		 		("text" "plain" ("charset" "utf-8") …)
				("text" "html" …)
			 */
			while ($iExtraItemPos < \count($aBodyStructure) && \is_array($aBodyStructure[$iExtraItemPos])) {
				$oPart = self::NewInstance($aBodyStructure[$iExtraItemPos], $sSubPartIDPrefix.$iIndex);
				if (!$oPart) {
					return null;
				}

				// For multipart, we have no charset info in the part itself. Thus,
				// obtain charset from nested parts.
				if (!$sCharset) {
					$sCharset = $oPart->Charset();
				}

				$aSubParts[] = $oPart;
				++$iExtraItemPos;
				++$iIndex;
			}

			/**
			 * Now process the subparts containter like:
				"alternative" ("boundary" "--boundary_id") …
			 */
			if ($iExtraItemPos < \count($aBodyStructure)) {
				if (!\is_string($aBodyStructure[$iExtraItemPos])) {
					return null;
				}
				$sContentTypeSub = \strtolower($aBodyStructure[$iExtraItemPos]);

				++$iExtraItemPos;
				if ($iExtraItemPos < \count($aBodyStructure) && \is_array($aBodyStructure[$iExtraItemPos])) {
					$aContentTypeParams = self::getKeyValueListFromArrayList($aBodyStructure[$iExtraItemPos]);
				}
			}
		} else if (\is_string($aBodyStructure[0])) {
			// Process simple (singlepart) body structure
			if (7 > \count($aBodyStructure) || !\is_string($aBodyStructure[1])) {
				return null;
			}

			$sContentTypeMain = \strtolower($aBodyStructure[0]);
			$sContentTypeSub = \strtolower($aBodyStructure[1]);

			$aBodyParamList = $aBodyStructure[2];
			if (\is_array($aBodyParamList)) {
				$aContentTypeParams = self::getKeyValueListFromArrayList($aBodyParamList);
				if (isset($aContentTypeParams['charset'])) {
					$sCharset = $aContentTypeParams['charset'];
				}
				$sFileName = self::decodeAttrParameter($aContentTypeParams, 'name', $sCharset);
				if ($sFileName) {
					$aContentTypeParams['name'] = $sFileName;
				}
			}

			if (null !== $aBodyStructure[3]) {
				if (!\is_string($aBodyStructure[3])) {
					return null;
				}
				$sContentID = $aBodyStructure[3];
			}

			if (null !== $aBodyStructure[4]) {
				if (!\is_string($aBodyStructure[4])) {
					return null;
				}
				$sDescription = $aBodyStructure[4];
			}

			if (null !== $aBodyStructure[5]) {
				if (!\is_string($aBodyStructure[5])) {
					return null;
				}
				$sMailEncodingName = $aBodyStructure[5];
			}

			$iSize = \is_numeric($aBodyStructure[6]) ? (int) $aBodyStructure[6] : -1;

			if (!\strlen($sPartID) || '.' === $sPartID[\strlen($sPartID) - 1]) {
				// This is the only sub-part of the message (otherwise, it would be
				// one of sub-parts of a multi-part, and partID would already be fully set up).
				$sPartID .= '1';
			}

			$iExtraItemPos = 7;
			if ('text' === $sContentTypeMain) {
				/**
				 * A body type of type TEXT contains, immediately after the basic
				 * fields, the size of the body in text lines.
				 */
				++$iExtraItemPos;
			} else if ('message' === $sContentTypeMain && 'rfc822' === $sContentTypeSub) {
				/**
				 * A body type of type MESSAGE and subtype RFC822 contains,
				 * immediately after the basic fields, the envelope structure,
				 * body structure, and size in text lines of the encapsulated message.
				 */
				$iExtraItemPos += 3;
			}
		} else {
			return null;
		}

		// Skip body MD5 because most mail servers leave it NIL anyway
		++$iExtraItemPos;

		$sDisposition = '';
		$sFileName = '';

		if ($iExtraItemPos < \count($aBodyStructure)) {
			$aDispList = $aBodyStructure[$iExtraItemPos];
			if (\is_array($aDispList) && 1 < \count($aDispList)) {
				if (!\is_string($aDispList[0])) {
					return null;
				}
				$sDisposition = $aDispList[0];
				if (\is_array($aDispList[1])) {
					$aDispositionParams = self::getKeyValueListFromArrayList($aDispList[1]);
					$sFileName = self::decodeAttrParameter($aDispositionParams, 'filename', $sCharset);
				}
			}
			++$iExtraItemPos;
		}

		$oStructure = new self;
		$oStructure->sContentType = \strtolower($sContentTypeMain.'/'.$sContentTypeSub);
		$oStructure->aContentTypeParams = $aContentTypeParams;
		$oStructure->sCharset = $sCharset;
		$oStructure->sContentID = $sContentID;
		$oStructure->sDescription = $sDescription;
		$oStructure->sMailEncodingName = \strtolower($sMailEncodingName);
		$oStructure->sDisposition = \strtolower($sDisposition);
		$oStructure->sFileName = \MailSo\Base\Utils::Utf8Clear($sFileName);
		$oStructure->iSize = $iSize;
		$oStructure->sPartID = $sPartID;
		$oStructure->aSubParts = $aSubParts;

		if ($iExtraItemPos < \count($aBodyStructure)) {
			if (\is_array($aBodyStructure[$iExtraItemPos])) {
				$oStructure->sLanguage = \implode(',', $aBodyStructure[$iExtraItemPos]);
			} else if (\is_string($aBodyStructure[$iExtraItemPos])) {
				$oStructure->sLanguage = $aBodyStructure[$iExtraItemPos];
			}
			++$iExtraItemPos;

			if ($iExtraItemPos < \count($aBodyStructure) && \is_string($aBodyStructure[$iExtraItemPos])) {
				$oStructure->sLocation = $aBodyStructure[$iExtraItemPos];
			}
		}

		return $oStructure;
	}

	/**
	 * Returns dict with key="charset" and value="US-ASCII" for array ("CHARSET" "US-ASCII").
	 * Keys are lowercased (StringDictionary itself does this), values are not altered.
	 */
	private static function getKeyValueListFromArrayList(array $aList) : array
	{
		$aDict = array();
		$iLen = \count($aList);
		if (0 === ($iLen % 2)) {
			for ($iIndex = 0; $iIndex < $iLen; $iIndex += 2) {
				if (\is_string($aList[$iIndex]) && \is_string($aList[$iIndex + 1])) {
					$aDict[\strtolower($aList[$iIndex])] = $aList[$iIndex + 1];
				}
			}
		}

		return $aDict;
	}
}
