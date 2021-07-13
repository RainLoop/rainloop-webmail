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
class Message implements \JsonSerializable
{
	private
		$sFolder = '',
		$iUid = 0,
		$sSubject = '',
		$sMessageId = '',
		$sContentType = '',
		$iSize = 0,
		$iSpamScore = 0,
		$sSpamResult = '',
		$bIsSpam = false,
		$iInternalTimeStampInUTC = 0,
		$iHeaderTimeStampInUTC = 0,
		$sHeaderDate = '',
		$aFlags = [],
		$aFlagsLowerCase = [],

		/**
		 * @var \MailSo\Mime\EmailCollection
		 */
		$oFrom = null,
		$oSender = null,
		$oReplyTo = null,
		$oDeliveredTo = null,
		$oTo = null,
		$oCc = null,
		$oBcc = null,

		$sInReplyTo = '',

		$sPlain = '',
		$sHtml = '',

		/**
		 * @var AttachmentCollection
		 */
		$oAttachments = null,

		/**
		 * @var array
		 */
		$aDraftInfo = null,

		$sReferences = '',

		/**
		 * @var int
		 */
		$iSensitivity,
		$iPriority,

		$sDeliveryReceipt = '',

		$sReadReceipt = '',

		$aUnsubsribeLinks = array(),

		$aThreads = array(),

		$bTextPartIsTrimmed = false,

		$sPgpSignature = '',
		$sPgpSignatureMicAlg = '',
		$bPgpSigned = false,
		$bPgpEncrypted = false;

	function __construct()
	{
		$this->iSensitivity = \MailSo\Mime\Enumerations\Sensitivity::NOTHING;
		$this->iPriority = \MailSo\Mime\Enumerations\MessagePriority::NORMAL;
	}

	public function Plain() : string
	{
		return $this->sPlain;
	}

	public function Html() : string
	{
		return $this->sHtml;
	}

	public function PgpSignature() : string
	{
		return $this->sPgpSignature;
	}

	public function PgpSignatureMicAlg() : string
	{
		return $this->sPgpSignatureMicAlg;
	}

	public function isPgpSigned() : bool
	{
		return $this->bPgpSigned;
	}

	public function isPgpEncrypted() : bool
	{
		return $this->bPgpEncrypted;
	}

	public function SetHtml(string $sHtml) : void
	{
		$this->sHtml = $sHtml;
	}

	public function Folder() : string
	{
		return $this->sFolder;
	}

	public function Uid() : int
	{
		return $this->iUid;
	}

	public function MessageId() : string
	{
		return $this->sMessageId;
	}

	public function Subject() : string
	{
		return $this->sSubject;
	}

	public function ContentType() : string
	{
		return $this->sContentType;
	}

	public function Size() : int
	{
		return $this->iSize;
	}

	public function SpamScore() : int
	{
		return $this->iSpamScore;
	}

	public function SpamResult() : string
	{
		return $this->sSpamResult;
	}

	public function IsSpam() : bool
	{
		return $this->bIsSpam;
	}

	public function InternalTimeStampInUTC() : int
	{
		return $this->iInternalTimeStampInUTC;
	}

	public function HeaderTimeStampInUTC() : int
	{
		return $this->iHeaderTimeStampInUTC;
	}

	public function HeaderDate() : string
	{
		return $this->sHeaderDate;
	}

	public function Flags() : array
	{
		return $this->aFlags;
	}

	public function FlagsLowerCase() : array
	{
		return $this->aFlagsLowerCase;
	}

	public function From() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oFrom;
	}

	public function Sensitivity() : int
	{
		return $this->iSensitivity;
	}

	public function Priority() : int
	{
		return $this->iPriority;
	}

	public function Sender() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oSender;
	}

	public function ReplyTo() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oReplyTo;
	}

	public function DeliveredTo() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oDeliveredTo;
	}

	public function To() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oTo;
	}

	public function Cc() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oCc;
	}

	public function Bcc() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oBcc;
	}

	public function Attachments() : ?AttachmentCollection
	{
		return $this->oAttachments;
	}

	public function InReplyTo() : string
	{
		return $this->sInReplyTo;
	}

	public function References() : string
	{
		return $this->sReferences;
	}

	public function DeliveryReceipt() : string
	{
		return $this->sDeliveryReceipt;
	}

	public function ReadReceipt() : string
	{
		return $this->sReadReceipt;
	}

	public function UnsubsribeLinks() : array
	{
		return $this->aUnsubsribeLinks;
	}

	public function ReadingConfirmation() : string
	{
		return $this->ReadReceipt();
	}

	public function DraftInfo() : ?array
	{
		return $this->aDraftInfo;
	}

	public function Threads() : array
	{
		return $this->aThreads;
	}

	public function SetThreads(array $aThreads)
	{
		$this->aThreads = $aThreads;
	}

	public static function NewFetchResponseInstance(string $sFolder, \MailSo\Imap\FetchResponse $oFetchResponse, ?\MailSo\Imap\BodyStructure $oBodyStructure = null) : self
	{
		return (new self)->InitByFetchResponse($sFolder, $oFetchResponse, $oBodyStructure);
	}

	public function InitByFetchResponse(string $sFolder, \MailSo\Imap\FetchResponse $oFetchResponse, ?\MailSo\Imap\BodyStructure $oBodyStructure = null) : self
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
		if (\strlen($sHeaders))
		{
			$oHeaders = new \MailSo\Mime\HeaderCollection($sHeaders, false, $sCharset);

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

			if ($this->oFrom) {
				$oHeaders->PopulateEmailColectionByDkim($this->oFrom);
			}

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

			// Unsubscribe links
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

			if ($spam = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_SPAMD_RESULT)) {
				if (\preg_match('/\\[([\\d\\.-]+)\\s*\\/\\s*([\\d\\.]+)\\];/', $spam, $match)) {
					if ($threshold = \floatval($match[2])) {
						$this->iSpamScore = \max(0, \min(100, 100 * \floatval($match[1]) / $threshold));
						$this->sSpamResult = "{$match[1]} / {$match[2]}";
					}
				}
				$this->bIsSpam = false !== \stripos($this->sSubject, '*** SPAM ***');
			} else if ($spam = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_BOGOSITY)) {
				$this->sSpamResult = $spam;
				$this->bIsSpam = !!\preg_match('/yes|spam/', $spam);
				if (\preg_match('/spamicity=([\\d\\.]+)/', $spam, $spamicity)) {
					$this->iSpamScore = \max(0, \min(100, \floatval($spamicity[1])));
				}
			} else if ($spam = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_SPAM_STATUS)) {
				if (\preg_match('/(?:hits|score)=([\\d\\.-]+)/', $spam, $value)
				 && \preg_match('/required=([\\d\\.-]+)/', $spam, $required)) {
					if ($threshold = \floatval($required[1])) {
						$this->iSpamScore = \max(0, \min(100, 100 * \floatval($value[1]) / $threshold));
						$this->sSpamResult = "{$value[1]} / {$required[1]}";
					}
				}
				$spam = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_SPAM_FLAG);
				$this->bIsSpam = false !== \stripos($spam, 'YES');
			}

			$sDraftInfo = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_DRAFT_INFO);
			if (0 < \strlen($sDraftInfo)) {
				$sType = '';
				$sFolder = '';
				$sUid = '';

				$oParameters = new \MailSo\Mime\ParameterCollection($sDraftInfo);
				foreach ($oParameters as $oParameter) {
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
				}

				if (0 < \strlen($sType) && 0 < \strlen($sFolder) && 0 < \strlen($sUid)) {
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

		// Content-Type: multipart/signed; micalg="pgp-sha256"; protocol="application/pgp-signature"
		if ('multipart/signed' === \strtolower($this->sContentType)
		 && 'application/pgp-signature' === \strtolower($oHeaders->ParameterValue(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, \MailSo\Mime\Enumerations\Parameter::PROTOCOL)))
		{
			$aPgpSignatureParts = $oBodyStructure ? $oBodyStructure->SearchByContentType('application/pgp-signature') : null;
			if ($this->bPgpSigned = !empty($aPgpSignatureParts)) {
				$sPgpSignatureText = $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::BODY.'['.$aPgpSignatureParts[0]->PartID().']');
				if (\is_string($sPgpSignatureText) && 0 < \strlen($sPgpSignatureText) && 0 < \strpos($sPgpSignatureText, 'BEGIN PGP SIGNATURE')) {
					$this->sPgpSignature = \trim($sPgpSignatureText);
					$this->sPgpSignatureMicAlg = (string) $oHeaders->ParameterValue(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, 'micalg');
				}
			}
		}

		// Content-Type: multipart/encrypted; protocol="application/pgp-encrypted"
		$this->bPgpEncrypted = ('multipart/encrypted' === \strtolower($this->sContentType)
		 && 'application/pgp-encrypted' === \strtolower($oHeaders->ParameterValue(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, \MailSo\Mime\Enumerations\Parameter::PROTOCOL)));

		$aTextParts = $oBodyStructure ? $oBodyStructure->SearchHtmlOrPlainParts() : null;
		if ($aTextParts)
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
			if (!$this->bPgpSigned && \preg_match('/-----BEGIN PGP SIGNATURE-----(.+)-----END PGP SIGNATURE-----/ism', $this->sPlain, $aMatch) && !empty($aMatch[0]))
			{
				$this->sPgpSignature = \trim($aMatch[0]);
				$this->bPgpSigned = true;
			}

			$this->bPgpEncrypted = !$this->bPgpEncrypted && false !== \stripos($this->sPlain, '-----BEGIN PGP MESSAGE-----');

			unset($aHtmlParts, $aPlainParts, $aMatch);
		}

		if ($oBodyStructure)
		{
			$aAttachmentsParts = $oBodyStructure->SearchAttachmentsParts();
			if ($aAttachmentsParts && 0 < count($aAttachmentsParts))
			{
				$this->oAttachments = new AttachmentCollection;
				foreach ($aAttachmentsParts as /* @var $oAttachmentItem \MailSo\Imap\BodyStructure */ $oAttachmentItem)
				{
					$this->oAttachments->append(
						Attachment::NewBodyStructureInstance($this->sFolder, $this->iUid, $oAttachmentItem)
					);
				}
			}
		}

		return $this;
	}

	public function jsonSerialize()
	{
		$oAttachments = $this->Attachments();
		$aFlags = $this->FlagsLowerCase();
		return array(
			'@Object' => 'Object/Message',
			'Folder' => $this->Folder(),
			'Uid' => (string) $this->Uid(),
			'Subject' => \trim(\MailSo\Base\Utils::Utf8Clear($this->Subject())),
			'MessageId' => $this->MessageId(),
			'Size' => $this->Size(),
			'SpamScore' => $this->SpamScore(),
			'SpamResult' => $this->SpamResult(),
			'IsSpam' => $this->IsSpam(),
			'DateTimeStampInUTC' => $this->InternalTimeStampInUTC(),

			// \MailSo\Mime\EmailCollection
			'From' => $this->From(),
			'ReplyTo' => $this->ReplyTo(),
			'To' => $this->To(),
			'Cc' => $this->Cc(),
			'Bcc' => $this->Bcc(),
			'Sender' => $this->Sender(),
			'DeliveredTo' => $this->DeliveredTo(),

			'Priority' => $this->Priority(),
			'Threads' => $this->Threads(),
			'Sensitivity' => $this->Sensitivity(),
			'UnsubsribeLinks' => $this->UnsubsribeLinks(),
			'ReadReceipt' => '',

			'HasAttachments' => $oAttachments ? 0 < $oAttachments->Count() : false,
			'AttachmentsSpecData' => $oAttachments ? $oAttachments->SpecData() : array(),

			// Flags
			'IsUnseen' => \in_array('\\unseen', $aFlags) || !\in_array('\\seen', $aFlags),
			'IsSeen' => \in_array('\\seen', $aFlags),
			'IsFlagged' => \in_array('\\flagged', $aFlags),
			'IsAnswered' => \in_array('\\answered', $aFlags),
			'IsDeleted' => \in_array('\\deleted', $aFlags)
		);
	}
}
