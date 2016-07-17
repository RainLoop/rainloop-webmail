<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mail;

/**
 * @category MailSo
 * @package Mail
 */
class Message
{
	/**
	 * @var string
	 */
	private $sFolder;

	/**
	 * @var int
	 */
	private $iUid;

	/**
	 * @var string
	 */
	private $sSubject;

	/**
	 * @var string
	 */
	private $sMessageId;

	/**
	 * @var string
	 */
	private $sContentType;

	/**
	 * @var int
	 */
	private $iSize;

	/**
	 * @var int
	 */
	private $iInternalTimeStampInUTC;

	/**
	 * @var int
	 */
	private $iHeaderTimeStampInUTC;

	/**
	 * @var string
	 */
	private $sHeaderDate;

	/**
	 * @var array
	 */
	private $aFlags;

	/**
	 * @var array
	 */
	private $aFlagsLowerCase;

	/**
	 * @var \MailSo\Mime\EmailCollection
	 */
	private $oFrom;

	/**
	 * @var \MailSo\Mime\EmailCollection
	 */
	private $oSender;

	/**
	 * @var \MailSo\Mime\EmailCollection
	 */
	private $oReplyTo;

	/**
	 * @var \MailSo\Mime\EmailCollection
	 */
	private $oDeliveredTo;

	/**
	 * @var \MailSo\Mime\EmailCollection
	 */
	private $oTo;

	/**
	 * @var \MailSo\Mime\EmailCollection
	 */
	private $oCc;

	/**
	 * @var \MailSo\Mime\EmailCollection
	 */
	private $oBcc;

	/**
	 * @var string
	 */
	private $sInReplyTo;

	/**
	 * @var string
	 */
	private $sPlain;

	/**
	 * @var string
	 */
	private $sHtml;

	/**
	 * @var \MailSo\Mail\AttachmentCollection
	 */
	private $oAttachments;

	/**
	 * @var array
	 */
	private $aDraftInfo;

	/**
	 * @var string
	 */
	private $sReferences;

	/**
	 * @var int
	 */
	private $iSensitivity;

	/**
	 * @var int
	 */
	private $iPriority;

	/**
	 * @var string
	 */
	private $sDeliveryReceipt;

	/**
	 * @var string
	 */
	private $sReadReceipt;

	/**
	 * @var array
	 */
	private $aUnsubsribeLinks;

	/**
	 * @var array
	 */
	private $aThreads;

	/**
	 * @var bool
	 */
	private $bTextPartIsTrimmed;

	/**
	 * @var string
	 */
	private $sPgpSignature;

	/**
	 * @var bool
	 */
	private $bPgpSigned;

	/**
	 * @var bool
	 */
	private $bPgpEncrypted;

	/**
	 * @access private
	 */
	private function __construct()
	{
		$this->Clear();
	}

	/**
	 * @return \MailSo\Mail\Message
	 */
	public function Clear()
	{
		$this->sFolder = '';
		$this->iUid = 0;
		$this->sSubject = '';
		$this->sMessageId = '';
		$this->sContentType = '';
		$this->iSize = 0;
		$this->iInternalTimeStampInUTC = 0;
		$this->iHeaderTimeStampInUTC = 0;
		$this->sHeaderDate = '';
		$this->aFlags = array();
		$this->aFlagsLowerCase = array();

		$this->oFrom = null;
		$this->oSender = null;
		$this->oReplyTo = null;
		$this->oDeliveredTo = null;
		$this->oTo = null;
		$this->oCc = null;
		$this->oBcc = null;

		$this->sPlain = '';
		$this->sHtml = '';

		$this->oAttachments = null;
		$this->aDraftInfo = null;

		$this->sInReplyTo = '';
		$this->sReferences = '';
		$this->aUnsubsribeLinks = array();

		$this->iSensitivity = \MailSo\Mime\Enumerations\Sensitivity::NOTHING;
		$this->iPriority = \MailSo\Mime\Enumerations\MessagePriority::NORMAL;
		$this->sDeliveryReceipt = '';
		$this->sReadReceipt = '';

		$this->aThreads = array();

		$this->bTextPartIsTrimmed = false;

		$this->sPgpSignature = '';
		$this->bPgpSigned = false;
		$this->bPgpEncrypted = false;

		return $this;
	}

	/**
	 * @return \MailSo\Mail\Message
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return string
	 */
	public function Plain()
	{
		return $this->sPlain;
	}

	/**
	 * @return string
	 */
	public function Html()
	{
		return $this->sHtml;
	}

	/**
	 * @return string
	 */
	public function PgpSignature()
	{
		return $this->sPgpSignature;
	}

	/**
	 * @return bool
	 */
	public function PgpSigned()
	{
		return $this->bPgpSigned;
	}

	/**
	 * @return bool
	 */
	public function PgpEncrypted()
	{
		return $this->bPgpEncrypted;
	}

	/**
	 * @param string $sHtml
	 *
	 * @retun void
	 */
	public function SetHtml($sHtml)
	{
		$this->sHtml = $sHtml;
	}

	/**
	 * @return string
	 */
	public function Folder()
	{
		return $this->sFolder;
	}

	/**
	 * @return int
	 */
	public function Uid()
	{
		return $this->iUid;
	}

	/**
	 * @return string
	 */
	public function MessageId()
	{
		return $this->sMessageId;
	}

	/**
	 * @return string
	 */
	public function Subject()
	{
		return $this->sSubject;
	}

	/**
	 * @return string
	 */
	public function ContentType()
	{
		return $this->sContentType;
	}

	/**
	 * @return int
	 */
	public function Size()
	{
		return $this->iSize;
	}

	/**
	 * @return int
	 */
	public function InternalTimeStampInUTC()
	{
		return $this->iInternalTimeStampInUTC;
	}

	/**
	 * @return int
	 */
	public function HeaderTimeStampInUTC()
	{
		return $this->iHeaderTimeStampInUTC;
	}

	/**
	 * @return string
	 */
	public function HeaderDate()
	{
		return $this->sHeaderDate;
	}

	/**
	 * @return array
	 */
	public function Flags()
	{
		return $this->aFlags;
	}

	/**
	 * @return array
	 */
	public function FlagsLowerCase()
	{
		return $this->aFlagsLowerCase;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function From()
	{
		return $this->oFrom;
	}

	/**
	 * @return int
	 */
	public function Sensitivity()
	{
		return $this->iSensitivity;
	}

	/**
	 * @return int
	 */
	public function Priority()
	{
		return $this->iPriority;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function Sender()
	{
		return $this->oSender;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function ReplyTo()
	{
		return $this->oReplyTo;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function DeliveredTo()
	{
		return $this->oDeliveredTo;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function To()
	{
		return $this->oTo;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function Cc()
	{
		return $this->oCc;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function Bcc()
	{
		return $this->oBcc;
	}

	/**
	 * @return \MailSo\Mail\AttachmentCollection
	 */
	public function Attachments()
	{
		return $this->oAttachments;
	}

	/**
	 * @return string
	 */
	public function InReplyTo()
	{
		return $this->sInReplyTo;
	}

	/**
	 * @return string
	 */
	public function References()
	{
		return $this->sReferences;
	}

	/**
	 * @return string
	 */
	public function DeliveryReceipt()
	{
		return $this->sDeliveryReceipt;
	}

	/**
	 * @return string
	 */
	public function ReadReceipt()
	{
		return $this->sReadReceipt;
	}

	/**
	 * @return array
	 */
	public function UnsubsribeLinks()
	{
		return $this->aUnsubsribeLinks;
	}

	/**
	 * @return string
	 */
	public function ReadingConfirmation()
	{
		return $this->ReadReceipt();
	}

	/**
	 * @return array | null
	 */
	public function DraftInfo()
	{
		return $this->aDraftInfo;
	}

	/**
	 * @return array
	 */
	public function Threads()
	{
		return $this->aThreads;
	}

	/**
	 * @param array $aThreads
	 */
	public function SetThreads($aThreads)
	{
		$this->aThreads = \is_array($aThreads) ? $aThreads : array();
	}

	/**
	 * @return boole
	 */
	public function TextPartIsTrimmed()
	{
		return $this->bTextPartIsTrimmed;
	}

	/**
	 * @param string $sFolder
	 * @param \MailSo\Imap\FetchResponse $oFetchResponse
	 * @param \MailSo\Imap\BodyStructure $oBodyStructure = null
	 *
	 * @return \MailSo\Mail\Message
	 */
	public static function NewFetchResponseInstance($sFolder, $oFetchResponse, $oBodyStructure = null)
	{
		return self::NewInstance()->InitByFetchResponse($sFolder, $oFetchResponse, $oBodyStructure);
	}

	/**
	 * @param string $sFolder
	 * @param \MailSo\Imap\FetchResponse $oFetchResponse
	 * @param \MailSo\Imap\BodyStructure $oBodyStructure = null
	 *
	 * @return \MailSo\Mail\Message
	 */
	public function InitByFetchResponse($sFolder, $oFetchResponse, $oBodyStructure = null)
	{
		if (!$oBodyStructure)
		{
			$oBodyStructure = $oFetchResponse->GetFetchBodyStructure();
		}

		$sUid = $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::UID);
		$sSize = $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::RFC822_SIZE);
		$sInternalDate = $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::INTERNALDATE);
		$aFlags = $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::FLAGS);

		$this->sFolder = $sFolder;
		$this->iUid = \is_numeric($sUid) ? (int) $sUid : 0;
		$this->iSize = \is_numeric($sSize) ? (int) $sSize : 0;
		$this->aFlags = \is_array($aFlags) ? $aFlags : array();
		$this->aFlagsLowerCase = \array_map('strtolower', $this->aFlags);

		$this->iInternalTimeStampInUTC =
			\MailSo\Base\DateTimeHelper::ParseInternalDateString($sInternalDate);

		$sCharset = $oBodyStructure ? $oBodyStructure->SearchCharset() : '';
		$sCharset = \MailSo\Base\Utils::NormalizeCharset($sCharset);

		$sHeaders = $oFetchResponse->GetHeaderFieldsValue();
		if (0 < \strlen($sHeaders))
		{
			$oHeaders = \MailSo\Mime\HeaderCollection::NewInstance()->Parse($sHeaders, false, $sCharset);

			$sContentTypeCharset = $oHeaders->ParameterValue(
				\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
				\MailSo\Mime\Enumerations\Parameter::CHARSET
			);

			if (0 < \strlen($sContentTypeCharset))
			{
				$sCharset = $sContentTypeCharset;
				$sCharset = \MailSo\Base\Utils::NormalizeCharset($sCharset);
			}

			if (0 < \strlen($sCharset))
			{
				$oHeaders->SetParentCharset($sCharset);
			}

			$bCharsetAutoDetect = 0 === \strlen($sCharset);

			$this->sSubject = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::SUBJECT, $bCharsetAutoDetect);
			$this->sMessageId = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::MESSAGE_ID);
			$this->sContentType = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE);

			$this->oFrom = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::FROM_, $bCharsetAutoDetect);
			$this->oTo = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::TO_, $bCharsetAutoDetect);
			$this->oCc = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::CC, $bCharsetAutoDetect);
			$this->oBcc = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::BCC, $bCharsetAutoDetect);

			$oHeaders->PopulateEmailColectionByDkim($this->oFrom);

			$this->oSender = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::SENDER, $bCharsetAutoDetect);
			$this->oReplyTo = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::REPLY_TO, $bCharsetAutoDetect);
			$this->oDeliveredTo = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::DELIVERED_TO, $bCharsetAutoDetect);

			$this->sInReplyTo = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::IN_REPLY_TO);
			$this->sReferences = \MailSo\Base\Utils::StripSpaces(
				$oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::REFERENCES));

			$sHeaderDate = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::DATE);
			$this->sHeaderDate = $sHeaderDate;
			$this->iHeaderTimeStampInUTC = \MailSo\Base\DateTimeHelper::ParseRFC2822DateString($sHeaderDate);

			// Sensitivity
			$this->iSensitivity = \MailSo\Mime\Enumerations\Sensitivity::NOTHING;
			$sSensitivity = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::SENSITIVITY);
			switch (\strtolower($sSensitivity))
			{
				case 'personal':
					$this->iSensitivity = \MailSo\Mime\Enumerations\Sensitivity::PERSONAL;
					break;
				case 'private':
					$this->iSensitivity = \MailSo\Mime\Enumerations\Sensitivity::PRIVATE_;
					break;
				case 'company-confidential':
					$this->iSensitivity = \MailSo\Mime\Enumerations\Sensitivity::CONFIDENTIAL;
					break;
			}

			// Priority
			$this->iPriority = \MailSo\Mime\Enumerations\MessagePriority::NORMAL;
			$sPriority = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_MSMAIL_PRIORITY);
			if (0 === \strlen($sPriority))
			{
				$sPriority = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::IMPORTANCE);
			}
			if (0 === \strlen($sPriority))
			{
				$sPriority = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_PRIORITY);
			}
			if (0 < \strlen($sPriority))
			{
				switch (\str_replace(' ', '', \strtolower($sPriority)))
				{
					case 'high':
					case '1(highest)':
					case '2(high)':
					case '1':
					case '2':
						$this->iPriority = \MailSo\Mime\Enumerations\MessagePriority::HIGH;
						break;

					case 'low':
					case '4(low)':
					case '5(lowest)':
					case '4':
					case '5':
						$this->iPriority = \MailSo\Mime\Enumerations\MessagePriority::LOW;
						break;
				}
			}

			// Delivery Receipt
			$this->sDeliveryReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::RETURN_RECEIPT_TO));

			// Read Receipt
			$this->sReadReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::DISPOSITION_NOTIFICATION_TO));
			if (empty($this->sReadReceipt))
			{
				$this->sReadReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_CONFIRM_READING_TO));
			}

			//Unsubscribe links
			$this->aUnsubsribeLinks = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::LIST_UNSUBSCRIBE);
			if (empty($this->aUnsubsribeLinks))
			{
				$this->aUnsubsribeLinks = array();
			}
			else
			{
				$this->aUnsubsribeLinks = explode(',', $this->aUnsubsribeLinks);
				$this->aUnsubsribeLinks = array_map(
					function ($link) {
						return trim($link, ' <>');
					},
					$this->aUnsubsribeLinks
				);
			}

			$sDraftInfo = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_DRAFT_INFO);
			if (0 < \strlen($sDraftInfo))
			{
				$sType = '';
				$sFolder = '';
				$sUid = '';

				\MailSo\Mime\ParameterCollection::NewInstance($sDraftInfo)
					->ForeachList(function ($oParameter) use (&$sType, &$sFolder, &$sUid) {

						switch (\strtolower($oParameter->Name()))
						{
							case 'type':
								$sType = $oParameter->Value();
								break;
							case 'uid':
								$sUid = $oParameter->Value();
								break;
							case 'folder':
								$sFolder = \base64_decode($oParameter->Value());
								break;
						}
					})
				;

				if (0 < \strlen($sType) && 0 < \strlen($sFolder) && 0 < \strlen($sUid))
				{
					$this->aDraftInfo = array($sType, $sUid, $sFolder);
				}
			}
		}
		else if ($oFetchResponse->GetEnvelope())
		{
			if (0 === \strlen($sCharset) && $oBodyStructure)
			{
				$sCharset = $oBodyStructure->SearchCharset();
				$sCharset = \MailSo\Base\Utils::NormalizeCharset($sCharset);
			}

			if (0 === \strlen($sCharset))
			{
				$sCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1;
			}

			// date, subject, from, sender, reply-to, to, cc, bcc, in-reply-to, message-id
			$this->sMessageId = $oFetchResponse->GetFetchEnvelopeValue(9, '');
			$this->sSubject = \MailSo\Base\Utils::DecodeHeaderValue($oFetchResponse->GetFetchEnvelopeValue(1, ''), $sCharset);

			$this->oFrom = $oFetchResponse->GetFetchEnvelopeEmailCollection(2, $sCharset);
			$this->oSender = $oFetchResponse->GetFetchEnvelopeEmailCollection(3, $sCharset);
			$this->oReplyTo = $oFetchResponse->GetFetchEnvelopeEmailCollection(4, $sCharset);
			$this->oTo = $oFetchResponse->GetFetchEnvelopeEmailCollection(5, $sCharset);
			$this->oCc = $oFetchResponse->GetFetchEnvelopeEmailCollection(6, $sCharset);
			$this->oBcc = $oFetchResponse->GetFetchEnvelopeEmailCollection(7, $sCharset);
			$this->sInReplyTo = $oFetchResponse->GetFetchEnvelopeValue(8, '');
		}

		$aTextParts = $oBodyStructure ? $oBodyStructure->SearchHtmlOrPlainParts() : null;
		if (\is_array($aTextParts) && 0 < \count($aTextParts))
		{
			if (0 === \strlen($sCharset))
			{
				$sCharset = \MailSo\Base\Enumerations\Charset::UTF_8;
			}

			$aHtmlParts = array();
			$aPlainParts = array();

			foreach ($aTextParts as $oPart)
			{
				$sText = $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::BODY.'['.$oPart->PartID().']');
				if (null === $sText)
				{
					$sText = $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::BODY.'['.$oPart->PartID().']<0>');
					if (\is_string($sText) && 0 < \strlen($sText))
					{
						$this->bTextPartIsTrimmed = true;
					}
				}

				if (\is_string($sText) && 0 < \strlen($sText))
				{
					$sTextCharset = $oPart->Charset();
					if (empty($sTextCharset))
					{
						$sTextCharset = $sCharset;
					}

					$sTextCharset = \MailSo\Base\Utils::NormalizeCharset($sTextCharset, true);

					$sText = \MailSo\Base\Utils::DecodeEncodingValue($sText, $oPart->MailEncodingName());
					$sText = \MailSo\Base\Utils::ConvertEncoding($sText, $sTextCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
					$sText = \MailSo\Base\Utils::Utf8Clear($sText);

					if ('text/html' === $oPart->ContentType())
					{
						$aHtmlParts[] = $sText;
					}
					else
					{
						if ($oPart->IsFlowedFormat())
						{
							$sText = \MailSo\Base\Utils::DecodeFlowedFormat($sText);
						}

						$aPlainParts[] = $sText;
					}
				}
			}

			if (0 < \count($aHtmlParts))
			{
				$this->sHtml = \implode('<br />', $aHtmlParts);
			}
			else
			{
				$this->sPlain = \trim(\implode("\n", $aPlainParts));
			}

			$aMatch = array();
			if (\preg_match('/-----BEGIN PGP SIGNATURE-----(.+)-----END PGP SIGNATURE-----/ism', $this->sPlain, $aMatch) && !empty($aMatch[0]))
			{
				$this->sPgpSignature = \trim($aMatch[0]);
				$this->bPgpSigned = true;
			}

			$aMatch = array();
			if (\preg_match('/-----BEGIN PGP MESSAGE-----/ism', $this->sPlain, $aMatch) && !empty($aMatch[0]))
			{
				$this->bPgpEncrypted = true;
			}

			unset($aHtmlParts, $aPlainParts, $aMatch);
		}

//		if (empty($this->sPgpSignature) && 'multipart/signed' === \strtolower($this->sContentType) &&
//			'application/pgp-signature' === \strtolower($oHeaders->ParameterValue(
//				\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
//				\MailSo\Mime\Enumerations\Parameter::PROTOCOL
//			)))
//		{
//			$aPgpSignatureParts = $oBodyStructure ? $oBodyStructure->SearchByContentType('application/pgp-signature') : null;
//			if (\is_array($aPgpSignatureParts) && 0 < \count($aPgpSignatureParts) && isset($aPgpSignatureParts[0]))
//			{
//				$sPgpSignatureText = $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::BODY.'['.$aPgpSignatureParts[0]->PartID().']');
//				if (\is_string($sPgpSignatureText) && 0 < \strlen($sPgpSignatureText) && 0 < \strpos($sPgpSignatureText, 'BEGIN PGP SIGNATURE'))
//				{
//					$this->sPgpSignature = \trim($sPgpSignatureText);
//					$this->bPgpSigned = true;
//				}
//			}
//		}

		if ($oBodyStructure)
		{
			$aAttachmentsParts = $oBodyStructure->SearchAttachmentsParts();
			if ($aAttachmentsParts && 0 < count($aAttachmentsParts))
			{
				$this->oAttachments = AttachmentCollection::NewInstance();
				foreach ($aAttachmentsParts as /* @var $oAttachmentItem \MailSo\Imap\BodyStructure */ $oAttachmentItem)
				{
					$this->oAttachments->Add(
						\MailSo\Mail\Attachment::NewBodyStructureInstance($this->sFolder, $this->iUid, $oAttachmentItem)
					);
				}
			}
		}

		return $this;
	}
}
