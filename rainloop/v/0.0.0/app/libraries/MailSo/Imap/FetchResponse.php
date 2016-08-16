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

	/**
	 * @access private
	 *
	 * @param \MailSo\Imap\Response $oImapResponse
	 */
	private function __construct($oImapResponse)
	{
		$this->oImapResponse = $oImapResponse;
		$this->aEnvelopeCache = null;
	}

	/**
	 * @param \MailSo\Imap\Response $oImapResponse
	 * @return \MailSo\Imap\FetchResponse
	 */
	public static function NewInstance($oImapResponse)
	{
		return new self($oImapResponse);
	}

	/**
	 * @param bool $bForce = false
	 *
	 * @return array|null
	 */
	public function GetEnvelope($bForce = false)
	{
		if (null === $this->aEnvelopeCache || $bForce)
		{
			$this->aEnvelopeCache = $this->GetFetchValue(Enumerations\FetchType::ENVELOPE);
		}
		return $this->aEnvelopeCache;
	}

	/**
	 * @param int $iIndex
	 * @param mixed $mNullResult = null
	 *
	 * @return mixed
	 */
	public function GetFetchEnvelopeValue($iIndex, $mNullResult)
	{
		return self::findEnvelopeIndex($this->GetEnvelope(), $iIndex, $mNullResult);
	}

	/**
	 * @param int $iIndex
	 * @param string $sParentCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1
	 *
	 * @return \MailSo\Mime\EmailCollection|null
	 */
	public function GetFetchEnvelopeEmailCollection($iIndex, $sParentCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1)
	{
		$oResult = null;
		$aEmails = $this->GetFetchEnvelopeValue($iIndex, null);
		if (is_array($aEmails) && 0 < count($aEmails))
		{
			$oResult = \MailSo\Mime\EmailCollection::NewInstance();
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
						$oResult->Add(
							\MailSo\Mime\Email::NewInstance($sLocalPart.'@'.$sDomainPart, $sDisplayName)
						);
					}
				}
			}
		}

		return $oResult;
	}

	/**
	 * @param string $sRfc822SubMimeIndex = ''
	 *
	 * @return \MailSo\Imap\BodyStructure|null
	 */
	public function GetFetchBodyStructure($sRfc822SubMimeIndex = '')
	{
		$oBodyStructure = null;
		$aBodyStructureArray = $this->GetFetchValue(Enumerations\FetchType::BODYSTRUCTURE);

		if (is_array($aBodyStructureArray))
		{
			if (0 < strlen($sRfc822SubMimeIndex))
			{
				$oBodyStructure = BodyStructure::NewInstanceFromRfc822SubPart($aBodyStructureArray, $sRfc822SubMimeIndex);
			}
			else
			{
				$oBodyStructure = BodyStructure::NewInstance($aBodyStructureArray);
			}
		}

		return $oBodyStructure;
	}

	/**
	 * @param string $sFetchItemName
	 *
	 * @return mixed
	 */
	public function GetFetchValue($sFetchItemName)
	{
		$mReturn = null;
		$bNextIsValue = false;

		if (Enumerations\FetchType::INDEX === $sFetchItemName)
		{
			$mReturn = $this->oImapResponse->ResponseList[1];
		}
		else if (isset($this->oImapResponse->ResponseList[3]) && \is_array($this->oImapResponse->ResponseList[3]))
		{
			foreach ($this->oImapResponse->ResponseList[3] as $mItem)
			{
				if ($bNextIsValue)
				{
					$mReturn = $mItem;
					break;
				}

				if ($sFetchItemName === $mItem)
				{
					$bNextIsValue = true;
				}
			}
		}

		return $mReturn;
	}

	/**
	 * @param string $sRfc822SubMimeIndex = ''
	 *
	 * @return string
	 */
	public function GetHeaderFieldsValue($sRfc822SubMimeIndex = '')
	{
		$sReturn = '';
		$bNextIsValue = false;

		$sRfc822SubMimeIndex = 0 < \strlen($sRfc822SubMimeIndex) ? ''.$sRfc822SubMimeIndex.'.' : '';

		if (isset($this->oImapResponse->ResponseList[3]) && \is_array($this->oImapResponse->ResponseList[3]))
		{
			foreach ($this->oImapResponse->ResponseList[3] as $mItem)
			{
				if ($bNextIsValue)
				{
					$sReturn = (string) $mItem;
					break;
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

		return $sReturn;
	}

	private static function findFetchUidAndSize($aList)
	{
		$bUid = false;
		$bSize = false;
		if (is_array($aList))
		{
			foreach ($aList as $mItem)
			{
				if (\MailSo\Imap\Enumerations\FetchType::UID === $mItem)
				{
					$bUid = true;
				}
				else if (\MailSo\Imap\Enumerations\FetchType::RFC822_SIZE === $mItem)
				{
					$bSize = true;
				}
			}
		}

		return $bUid && $bSize;
	}

	/**
	 * @param \MailSo\Imap\Response $oImapResponse
	 *
	 * @return bool
	 */
	public static function IsValidFetchImapResponse($oImapResponse)
	{
		return (
			$oImapResponse
			&& true !== $oImapResponse->IsStatusResponse
			&& \MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType
			&& 3 < count($oImapResponse->ResponseList) && 'FETCH' === $oImapResponse->ResponseList[2]
			&& is_array($oImapResponse->ResponseList[3])
		);
	}

	/**
	 * @param \MailSo\Imap\Response $oImapResponse
	 *
	 * @return bool
	 */
	public static function IsNotEmptyFetchImapResponse($oImapResponse)
	{
		return (
			$oImapResponse
			&& self::IsValidFetchImapResponse($oImapResponse)
			&& isset($oImapResponse->ResponseList[3])
			&& self::findFetchUidAndSize($oImapResponse->ResponseList[3])
		);
	}

	/**
	 * @param array $aEnvelope
	 * @param int $iIndex
	 * @param mixed $mNullResult = null
	 *
	 * @return mixed
	 */
	private static function findEnvelopeIndex($aEnvelope, $iIndex, $mNullResult)
	{
		return (isset($aEnvelope[$iIndex]) && 'NIL' !== $aEnvelope[$iIndex] && '' !== $aEnvelope[$iIndex])
			? $aEnvelope[$iIndex] : $mNullResult;
	}
}
