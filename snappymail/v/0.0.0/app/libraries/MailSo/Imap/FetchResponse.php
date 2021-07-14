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
class FetchResponse
{
	/**
	 * @var \MailSo\Imap\Response
	 */
	private $oImapResponse;

	/**
	 * @var array|null
	 */
	private $aEnvelopeCache;

	function __construct(Response $oImapResponse)
	{
		$this->oImapResponse = $oImapResponse;
		$this->aEnvelopeCache = null;
	}

	public function GetEnvelope(bool $bForce = false) : ?array
	{
		if (null === $this->aEnvelopeCache || $bForce)
		{
			$this->aEnvelopeCache = $this->GetFetchValue(Enumerations\FetchType::ENVELOPE);
		}
		return $this->aEnvelopeCache;
	}

	/**
	 * @return mixed
	 */
	public function GetFetchEnvelopeValue(int $iIndex, ?string $mNullResult = null)
	{
		return self::findEnvelopeIndex($this->GetEnvelope(), $iIndex, $mNullResult);
	}

	public function GetFetchEnvelopeEmailCollection(int $iIndex, string $sParentCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1) : ?\MailSo\Mime\EmailCollection
	{
		$oResult = null;
		$aEmails = $this->GetFetchEnvelopeValue($iIndex);
		if (is_array($aEmails) && 0 < count($aEmails))
		{
			$oResult = new \MailSo\Mime\EmailCollection;
			foreach ($aEmails as $aEmailItem)
			{
				if (is_array($aEmailItem) && 4 === count($aEmailItem))
				{
					$sDisplayName = \MailSo\Base\Utils::DecodeHeaderValue(
						self::findEnvelopeIndex($aEmailItem, 0, ''), $sParentCharset);

//					$sRemark = \MailSo\Base\Utils::DecodeHeaderValue(
//						self::findEnvelopeIndex($aEmailItem, 1, ''), $sParentCharset);

					$sLocalPart = self::findEnvelopeIndex($aEmailItem, 2, '');
					$sDomainPart = self::findEnvelopeIndex($aEmailItem, 3, '');

					if (0 < strlen($sLocalPart) && 0 < strlen($sDomainPart))
					{
						$oResult->append(
							new \MailSo\Mime\Email($sLocalPart.'@'.$sDomainPart, $sDisplayName)
						);
					}
				}
			}
		}

		return $oResult;
	}

	public function GetFetchBodyStructure(string $sRfc822SubMimeIndex = '') : ?BodyStructure
	{
		$aBodyStructureArray = $this->GetFetchValue(Enumerations\FetchType::BODYSTRUCTURE);

		if (is_array($aBodyStructureArray))
		{
			if (0 < strlen($sRfc822SubMimeIndex))
			{
				return BodyStructure::NewInstanceFromRfc822SubPart($aBodyStructureArray, $sRfc822SubMimeIndex);
			}
			return BodyStructure::NewInstance($aBodyStructureArray);
		}

		return null;
	}

	/**
	 * @return mixed
	 */
	public function GetFetchValue(string $sFetchItemName)
	{
		if (Enumerations\FetchType::INDEX === $sFetchItemName) {
			return $this->oImapResponse->ResponseList[1];
		}

		if (isset($this->oImapResponse->ResponseList[3]) && \is_array($this->oImapResponse->ResponseList[3])) {
			$bNextIsValue = false;
			foreach ($this->oImapResponse->ResponseList[3] as $mItem) {
				if ($bNextIsValue) {
					return $mItem;
				}

				if ($sFetchItemName === $mItem) {
					$bNextIsValue = true;
				}
			}
		}

		return null;
	}

	public function GetHeaderFieldsValue(string $sRfc822SubMimeIndex = '') : string
	{
		$bNextIsValue = false;

		$sRfc822SubMimeIndex = 0 < \strlen($sRfc822SubMimeIndex) ? ''.$sRfc822SubMimeIndex.'.' : '';

		if (isset($this->oImapResponse->ResponseList[3]) && \is_array($this->oImapResponse->ResponseList[3]))
		{
			foreach ($this->oImapResponse->ResponseList[3] as $mItem)
			{
				if ($bNextIsValue)
				{
					return (string) $mItem;
				}

				if (\is_string($mItem) && (
					$mItem === 'BODY['.$sRfc822SubMimeIndex.'HEADER]' ||
					0 === \strpos($mItem, 'BODY['.$sRfc822SubMimeIndex.'HEADER.FIELDS') ||
					$mItem === 'BODY['.$sRfc822SubMimeIndex.'MIME]'))
				{
					$bNextIsValue = true;
				}
			}
		}

		return '';
	}

	private static function findFetchUidAndSize(array $aList) : bool
	{
		$bUid = false;
		$bSize = false;
		foreach ($aList as $mItem)
		{
			if (Enumerations\FetchType::UID === $mItem)
			{
				$bUid = true;
			}
			else if (Enumerations\FetchType::RFC822_SIZE === $mItem)
			{
				$bSize = true;
			}
		}
		return $bUid && $bSize;
	}

	public static function IsValidFetchImapResponse(Response $oImapResponse) : bool
	{
		return (
			$oImapResponse
			&& true !== $oImapResponse->IsStatusResponse
			&& Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType
			&& 3 < count($oImapResponse->ResponseList) && 'FETCH' === $oImapResponse->ResponseList[2]
			&& is_array($oImapResponse->ResponseList[3])
		);
	}

	public static function IsNotEmptyFetchImapResponse(Response $oImapResponse) : bool
	{
		return (
			$oImapResponse
			&& self::IsValidFetchImapResponse($oImapResponse)
			&& isset($oImapResponse->ResponseList[3])
			&& self::findFetchUidAndSize($oImapResponse->ResponseList[3])
		);
	}

	/**
	 * @return mixed
	 */
	private static function findEnvelopeIndex(array $aEnvelope, int $iIndex, ?string $mNullResult)
	{
		return (isset($aEnvelope[$iIndex]) && 'NIL' !== $aEnvelope[$iIndex] && '' !== $aEnvelope[$iIndex])
			? $aEnvelope[$iIndex] : $mNullResult;
	}
}
