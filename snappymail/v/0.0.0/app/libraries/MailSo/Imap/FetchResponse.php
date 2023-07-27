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
	public Response $oImapResponse;

	private ?array $aEnvelopeCache = null;

	function __construct(Response $oImapResponse)
	{
		$this->oImapResponse = $oImapResponse;
	}

	public function GetEnvelope(bool $bForce = false) : ?array
	{
		if (null === $this->aEnvelopeCache || $bForce) {
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
		if (\is_array($aEmails) && \count($aEmails)) {
			$oResult = new \MailSo\Mime\EmailCollection;
			foreach ($aEmails as $aEmailItem) {
				if (\is_array($aEmailItem) && 4 === \count($aEmailItem)) {
					$sDisplayName = \MailSo\Base\Utils::DecodeHeaderValue(
						self::findEnvelopeIndex($aEmailItem, 0, ''), $sParentCharset);

//					$sRemark = \MailSo\Base\Utils::DecodeHeaderValue(
//						self::findEnvelopeIndex($aEmailItem, 1, ''), $sParentCharset);

					$sLocalPart = self::findEnvelopeIndex($aEmailItem, 2, '');
					$sDomainPart = self::findEnvelopeIndex($aEmailItem, 3, '');

					if (\strlen($sLocalPart) && \strlen($sDomainPart)) {
						$oResult->append(
							new \MailSo\Mime\Email($sLocalPart.'@'.$sDomainPart, $sDisplayName)
						);
					}
				}
			}
		}

		return $oResult;
	}

	public function GetFetchBodyStructure() : ?BodyStructure
	{
		$aBodyStructureArray = $this->GetFetchValue(Enumerations\FetchType::BODYSTRUCTURE);

		return \is_array($aBodyStructureArray)
			? BodyStructure::NewInstance($aBodyStructureArray)
			: null;
	}

	/**
	 * Like: UID, RFC822.SIZE, MODSEQ, INTERNALDATE, FLAGS, BODYSTRUCTURE
	 * @return mixed
	 */
	public function GetFetchValue(string $sFetchItemName)
	{
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

	/**
	 * Like: BODY[HEADER.FIELDS (RETURN-PATH RECEIVED MIME-VERSION MESSAGE-ID CONTENT-TYPE FROM TO CC BCC SENDER REPLY-TO DELIVERED-TO IN-REPLY-TO REFERENCES DATE SUBJECT SENSITIVITY X-MSMAIL-PRIORITY IMPORTANCE X-PRIORITY X-DRAFT-INFO RETURN-RECEIPT-TO DISPOSITION-NOTIFICATION-TO X-CONFIRM-READING-TO AUTHENTICATION-RESULTS X-DKIM-AUTHENTICATION-RESULTS LIST-UNSUBSCRIBE X-SPAM-STATUS X-SPAMD-RESULT X-BOGOSITY X-VIRUS X-VIRUS-SCANNED X-VIRUS-STATUS)]
	 * @return mixed
	 */
	public function GetHeaderFieldsValue() : string
	{
		$bNextIsValue = false;

		if (isset($this->oImapResponse->ResponseList[3]) && \is_array($this->oImapResponse->ResponseList[3])) {
			foreach ($this->oImapResponse->ResponseList[3] as $mItem) {
				if ($bNextIsValue) {
					return (string) $mItem;
				}

				if (\is_string($mItem) && (
					$mItem === 'BODY[HEADER]' ||
					\str_starts_with($mItem, 'BODY[HEADER.FIELDS') ||
					$mItem === 'BODY[MIME]'))
				{
					$bNextIsValue = true;
				}
			}
		}

		return '';
	}

	public static function isValidImapResponse(Response $oImapResponse) : bool
	{
		return
			true !== $oImapResponse->IsStatusResponse
			&& Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType
			&& 3 < \count($oImapResponse->ResponseList) && 'FETCH' === $oImapResponse->ResponseList[2]
			&& \is_array($oImapResponse->ResponseList[3]);
	}

	public static function hasUidAndSize(Response $oImapResponse) : bool
	{
		return \in_array(Enumerations\FetchType::UID, $oImapResponse->ResponseList[3])
			&& \in_array(Enumerations\FetchType::RFC822_SIZE, $oImapResponse->ResponseList[3]);
	}

	/**
	 * @return mixed
	 */
	private static function findEnvelopeIndex(array $aEnvelope, int $iIndex, ?string $mNullResult)
	{
		return (isset($aEnvelope[$iIndex]) && '' !== $aEnvelope[$iIndex])
			? $aEnvelope[$iIndex] : $mNullResult;
	}
}
