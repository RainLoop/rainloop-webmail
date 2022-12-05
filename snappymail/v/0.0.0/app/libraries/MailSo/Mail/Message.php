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

use \MailSo\Base\Utils;
use \MailSo\Imap\Enumerations\FetchType;

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
		$bHasVirus = null,
		$sVirusScanned = '',
		$iInternalTimeStampInUTC = 0,
		$iHeaderTimeStampInUTC = 0,
		$sHeaderDate = '',
//		$aFlags = [],
		$aFlagsLowerCase = [],

		/**
		 * https://www.rfc-editor.org/rfc/rfc8474#section-5
		 */
		$sEmailId = '',
		$sThreadId = '',

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
		$iPriority,

		$sDeliveryReceipt = '',

		$sReadReceipt = '',

		// https://autocrypt.org/level1.html#the-autocrypt-header
		$sAutocrypt = '',

		$aUnsubsribeLinks = array(),

		$aThreads = array(),

		$aPgpSigned = null,
		$aPgpEncrypted = null;

	function __construct()
	{
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

	public function PgpSigned() : ?array
	{
		return $this->aPgpSigned;
	}

	public function PgpEncrypted() : ?array
	{
		return $this->aPgpEncrypted;
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

	private function setSpamScore($value) : void
	{
		$this->iSpamScore = \intval(\max(0, \min(100, $value)));
	}

	public function SpamResult() : string
	{
		return $this->sSpamResult;
	}

	public function IsSpam() : bool
	{
		return $this->bIsSpam;
	}

	/**
	 * null = not scanned
	 * true = scanned and infected
	 * false = scanned and no infection found
	 */
	public function HasVirus() : ?bool
	{
		return $this->bHasVirus;
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

	public function From() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oFrom;
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
		$oMessage = new self;

		if (!$oBodyStructure)
		{
			$oBodyStructure = $oFetchResponse->GetFetchBodyStructure();
		}

		$aFlags = $oFetchResponse->GetFetchValue(FetchType::FLAGS) ?: [];

		$oMessage->sFolder = $sFolder;
		$oMessage->iUid = (int) $oFetchResponse->GetFetchValue(FetchType::UID);
		$oMessage->iSize = (int) $oFetchResponse->GetFetchValue(FetchType::RFC822_SIZE);
//		$oMessage->aFlags = $aFlags;
		$oMessage->aFlagsLowerCase = \array_map('mb_strtolower', \array_map('\\MailSo\\Base\\Utils::Utf7ModifiedToUtf8', $aFlags));
		$oMessage->iInternalTimeStampInUTC = \MailSo\Base\DateTimeHelper::ParseInternalDateString(
			$oFetchResponse->GetFetchValue(FetchType::INTERNALDATE)
		);

		$oMessage->sEmailId = $oFetchResponse->GetFetchValue(FetchType::EMAILID)
//			?: $oFetchResponse->GetFetchValue('X-GUID')
			?: $oFetchResponse->GetFetchValue('X-GM-MSGID');
		$oMessage->sThreadId = $oFetchResponse->GetFetchValue(FetchType::THREADID)
			?: $oFetchResponse->GetFetchValue('X-GM-THRID');

		$sCharset = $oBodyStructure ? Utils::NormalizeCharset($oBodyStructure->SearchCharset()) : '';

		$sHeaders = $oFetchResponse->GetHeaderFieldsValue();
		if (\strlen($sHeaders))
		{
			$oHeaders = new \MailSo\Mime\HeaderCollection($sHeaders, false, $sCharset);

			$sContentTypeCharset = $oHeaders->ParameterValue(
				\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
				\MailSo\Mime\Enumerations\Parameter::CHARSET
			);

			if (\strlen($sContentTypeCharset))
			{
				$sCharset = Utils::NormalizeCharset($sContentTypeCharset);
			}

			if (\strlen($sCharset))
			{
				$oHeaders->SetParentCharset($sCharset);
			}

			$bCharsetAutoDetect = !\strlen($sCharset);

			$oMessage->sSubject = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::SUBJECT, $bCharsetAutoDetect);
			$oMessage->sMessageId = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::MESSAGE_ID);
			$oMessage->sContentType = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE);

			$oMessage->oFrom = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::FROM_, $bCharsetAutoDetect);
			$oMessage->oTo = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::TO_, $bCharsetAutoDetect);
			$oMessage->oCc = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::CC, $bCharsetAutoDetect);
			$oMessage->oBcc = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::BCC, $bCharsetAutoDetect);

			if ($oMessage->oFrom) {
				$oHeaders->PopulateEmailColectionByDkim($oMessage->oFrom);
			}

			$oMessage->oSender = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::SENDER, $bCharsetAutoDetect);
			$oMessage->oReplyTo = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::REPLY_TO, $bCharsetAutoDetect);
			$oMessage->oDeliveredTo = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::DELIVERED_TO, $bCharsetAutoDetect);

			$oMessage->sInReplyTo = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::IN_REPLY_TO);
			$oMessage->sReferences = Utils::StripSpaces(
				$oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::REFERENCES));

			$sHeaderDate = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::DATE);
			$oMessage->sHeaderDate = $sHeaderDate;
			$oMessage->iHeaderTimeStampInUTC = \MailSo\Base\DateTimeHelper::ParseRFC2822DateString($sHeaderDate);

			// Priority
			$oMessage->iPriority = \MailSo\Mime\Enumerations\MessagePriority::NORMAL;
			$sPriority = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_MSMAIL_PRIORITY);
			if (!\strlen($sPriority))
			{
				$sPriority = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::IMPORTANCE);
			}
			if (!\strlen($sPriority))
			{
				$sPriority = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_PRIORITY);
			}
			if (\strlen($sPriority))
			{
				switch (\str_replace(' ', '', \strtolower($sPriority)))
				{
					case 'high':
					case '1(highest)':
					case '2(high)':
					case '1':
					case '2':
						$oMessage->iPriority = \MailSo\Mime\Enumerations\MessagePriority::HIGH;
						break;

					case 'low':
					case '4(low)':
					case '5(lowest)':
					case '4':
					case '5':
						$oMessage->iPriority = \MailSo\Mime\Enumerations\MessagePriority::LOW;
						break;
				}
			}

			// Delivery Receipt
			$oMessage->sDeliveryReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::RETURN_RECEIPT_TO));

			// Read Receipt
			$oMessage->sReadReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::DISPOSITION_NOTIFICATION_TO));
			if (empty($oMessage->sReadReceipt))
			{
				$oMessage->sReadReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_CONFIRM_READING_TO));
			}

			// Unsubscribe links
			$oMessage->aUnsubsribeLinks = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::LIST_UNSUBSCRIBE);
			if (empty($oMessage->aUnsubsribeLinks))
			{
				$oMessage->aUnsubsribeLinks = array();
			}
			else
			{
				$oMessage->aUnsubsribeLinks = explode(',', $oMessage->aUnsubsribeLinks);
				$oMessage->aUnsubsribeLinks = array_map(
					function ($link) {
						return trim($link, ' <>');
					},
					$oMessage->aUnsubsribeLinks
				);
			}

			if ($spam = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_SPAMD_RESULT)) {
				if (\preg_match('/\\[([\\d\\.-]+)\\s*\\/\\s*([\\d\\.]+)\\];/', $spam, $match)) {
					if ($threshold = \floatval($match[2])) {
						$oMessage->setSpamScore(100 * \floatval($match[1]) / $threshold);
						$oMessage->sSpamResult = "{$match[1]} / {$match[2]}";
					}
				}
				$oMessage->bIsSpam = false !== \stripos($oMessage->sSubject, '*** SPAM ***');
			} else if ($spam = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_BOGOSITY)) {
				$oMessage->sSpamResult = $spam;
				$oMessage->bIsSpam = !\str_contains($spam, 'Ham');
				if (\preg_match('/spamicity=([\\d\\.]+)/', $spam, $spamicity)) {
					$oMessage->setSpamScore(100 * \floatval($spamicity[1]));
				}
			} else if ($spam = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_SPAM_STATUS)) {
				$oMessage->sSpamResult = $spam;
				if (\preg_match('/(?:hits|score)=([\\d\\.-]+)/', $spam, $value)
				 && \preg_match('/required=([\\d\\.-]+)/', $spam, $required)) {
					if ($threshold = \floatval($required[1])) {
						$oMessage->setSpamScore(100 * \floatval($value[1]) / $threshold);
						$oMessage->sSpamResult = "{$value[1]} / {$required[1]}";
					}
				}
				$oMessage->bIsSpam = 'Yes' === \substr($spam, 0, 3);
//				$spam = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_SPAM_FLAG);
//				$oMessage->bIsSpam = false !== \stripos($spam, 'YES');
			}

			if ($virus = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_VIRUS)) {
				$oMessage->bHasVirus = true;
			}
			if ($virus = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_VIRUS_STATUS)) {
				if (false !== \stripos($spam, 'infected')) {
					$oMessage->bHasVirus = true;
				} else if (false !== \stripos($spam, 'clean')) {
					$oMessage->bHasVirus = false;
				}
			}
			if ($virus = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_VIRUS_SCANNED)) {
				$oMessage->sVirusScanned = $virus;
			}

			$sDraftInfo = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_DRAFT_INFO);
			if (\strlen($sDraftInfo)) {
				$sType = '';
				$sFolder = '';
				$iUid = 0;

				$oParameters = new \MailSo\Mime\ParameterCollection($sDraftInfo);
				foreach ($oParameters as $oParameter) {
					switch (\strtolower($oParameter->Name()))
					{
						case 'type':
							$sType = $oParameter->Value();
							break;
						case 'uid':
							$iUid = (int) $oParameter->Value();
							break;
						case 'folder':
							$sFolder = \base64_decode($oParameter->Value());
							break;
					}
				}

				if (\strlen($sType) && \strlen($sFolder) && $iUid) {
					$oMessage->aDraftInfo = array($sType, $iUid, $sFolder);
				}
			}

			$oMessage->sAutocrypt = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::AUTOCRYPT);
		}
		else if ($oFetchResponse->GetEnvelope())
		{
			$sCharset = $sCharset ?: \MailSo\Base\Enumerations\Charset::ISO_8859_1;

			// date, subject, from, sender, reply-to, to, cc, bcc, in-reply-to, message-id
			$oMessage->sMessageId = $oFetchResponse->GetFetchEnvelopeValue(9, '');
			$oMessage->sSubject = Utils::DecodeHeaderValue($oFetchResponse->GetFetchEnvelopeValue(1, ''), $sCharset);

			$oMessage->oFrom = $oFetchResponse->GetFetchEnvelopeEmailCollection(2, $sCharset);
			$oMessage->oSender = $oFetchResponse->GetFetchEnvelopeEmailCollection(3, $sCharset);
			$oMessage->oReplyTo = $oFetchResponse->GetFetchEnvelopeEmailCollection(4, $sCharset);
			$oMessage->oTo = $oFetchResponse->GetFetchEnvelopeEmailCollection(5, $sCharset);
			$oMessage->oCc = $oFetchResponse->GetFetchEnvelopeEmailCollection(6, $sCharset);
			$oMessage->oBcc = $oFetchResponse->GetFetchEnvelopeEmailCollection(7, $sCharset);
			$oMessage->sInReplyTo = $oFetchResponse->GetFetchEnvelopeValue(8, '');
		}

		if ($oBodyStructure)
		{
			$gEncryptedParts = $oBodyStructure->SearchByContentType('multipart/encrypted');
			foreach ($gEncryptedParts as $oPart) {
				if ($oPart->IsPgpEncrypted()) {
					$oMessage->aPgpEncrypted = [
						'PartId' => $oPart->SubParts()[1]->PartID()
					];
				}
			}

			$gSignatureParts = $oBodyStructure->SearchByContentType('multipart/signed');
			foreach ($gSignatureParts as $oPart) {
				if (!$oPart->IsPgpSigned()) {
					continue;
				}
				$oPgpSignaturePart = $oPart->SubParts()[1];
				$oMessage->aPgpSigned = [
					// /?/Raw/&q[]=/0/Download/&q[]=/...
					// /?/Raw/&q[]=/0/View/&q[]=/...
					'BodyPartId' => $oPart->SubParts()[0]->PartID(),
					'SigPartId' => $oPgpSignaturePart->PartID(),
					'MicAlg' => (string) $oHeaders->ParameterValue(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, 'micalg')
				];
/*
				// An empty section specification refers to the entire message, including the header.
				// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
				$sPgpText = \trim(
					\trim($oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->aPgpSigned['BodyPartId'].'.MIME]'))
					. "\r\n\r\n"
					. \trim($oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->aPgpSigned['BodyPartId'].']'))
				);
				if ($sPgpText) {
					$oMessage->aPgpSigned['Body'] = $sPgpText;
				}
				$sPgpSignatureText = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->aPgpSigned['SigPartId'].']');
				if ($sPgpSignatureText && 0 < \strpos($sPgpSignatureText, 'BEGIN PGP SIGNATURE')) {
					$oMessage->aPgpSigned['Signature'] = $oPart->SubParts()[0]->PartID();
				}
*/
				break;
			}

			$aTextParts = $oBodyStructure->GetHtmlAndPlainParts();
			if ($aTextParts)
			{
				$sCharset = $sCharset ?: \MailSo\Base\Enumerations\Charset::UTF_8;

				$aHtmlParts = array();
				$aPlainParts = array();

				foreach ($aTextParts as $oPart)
				{
					$sText = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oPart->PartID().']');
					if (null === $sText)
					{
						// TextPartIsTrimmed ?
						$sText = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oPart->PartID().']<0>');
					}

					if (\is_string($sText) && \strlen($sText))
					{
						$sText = Utils::DecodeEncodingValue($sText, $oPart->MailEncodingName());
						$sText = Utils::ConvertEncoding($sText,
							Utils::NormalizeCharset($oPart->Charset() ?: $sCharset, true),
							\MailSo\Base\Enumerations\Charset::UTF_8
						);
						$sText = Utils::Utf8Clear($sText);

						// https://datatracker.ietf.org/doc/html/rfc4880#section-7
						// Cleartext Signature
						if (!$oMessage->aPgpSigned && \str_contains($sText, '-----BEGIN PGP SIGNED MESSAGE-----'))
						{
							$oMessage->aPgpSigned = [
								'BodyPartId' => $oPart->PartID()
							];
						}

						if (\str_contains($sText, '-----BEGIN PGP MESSAGE-----'))
						{
							$keyIds = [];
							if (\SnappyMail\PGP\GPG::isSupported()) {
								$GPG = new \SnappyMail\PGP\GPG('');
								$keyIds = $GPG->getEncryptedMessageKeys($sText);
							}
							$oMessage->aPgpEncrypted = [
								'PartId' => $oPart->PartID(),
								'KeyIds' => $keyIds
							];
						}

						if ('text/html' === $oPart->ContentType())
						{
							$aHtmlParts[] = $sText;
						}
						else
						{
							if ($oPart->IsFlowedFormat())
							{
								$sText = Utils::DecodeFlowedFormat($sText);
							}

							$aPlainParts[] = $sText;
						}
					}
				}

				$oMessage->sHtml = \implode('<br>', $aHtmlParts);
				$oMessage->sPlain = \trim(\implode("\n", $aPlainParts));

				unset($aHtmlParts, $aPlainParts);
			}

			$gAttachmentsParts = $oBodyStructure->SearchAttachmentsParts();
			if ($gAttachmentsParts->valid())
			{
				$oMessage->oAttachments = new AttachmentCollection;
				foreach ($gAttachmentsParts as /* @var $oAttachmentItem \MailSo\Imap\BodyStructure */ $oAttachmentItem)
				{
//					if ('application/pgp-keys' === $oAttachmentItem->ContentType()) import ???
					$oMessage->oAttachments->append(
						Attachment::NewBodyStructureInstance($oMessage->sFolder, $oMessage->iUid, $oAttachmentItem)
					);
				}
			}
		}

		return $oMessage;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
/*
		// JMAP-only RFC8621 keywords (RFC5788)
		$keywords = \array_fill_keys(\str_replace(
			['\\draft', '\\seen', '\\flagged', '\\answered'],
			[ '$draft',  '$seen',  '$flagged',  '$answered'],
			$this->aFlagsLowerCase
		), true);
*/
		// https://datatracker.ietf.org/doc/html/rfc5788#section-3.4.1
		// Thunderbird $label1 is same as $Important?
		// Thunderbird $label4 is same as $todo?
		$aFlags = \array_unique(\str_replace(
			['$readreceipt', '$replied',  /* 'junk',  'nonjunk',  '$queued',        '$sent',      'sent'*/],
			['$mdnsent',     '\\answered',/* '$junk', '$notjunk', '$submitpending', '$submitted', '$submitted'*/],
			$this->aFlagsLowerCase
		));

		return array(
			'@Object' => 'Object/Message',
			'Folder' => $this->sFolder,
			'Uid' => $this->iUid,
			'subject' => \trim(Utils::Utf8Clear($this->sSubject)),
			'encrypted' => 'multipart/encrypted' == $this->sContentType || $this->PgpEncrypted(),
			'MessageId' => $this->sMessageId,
			'SpamScore' => $this->bIsSpam ? 100 : $this->iSpamScore,
			'SpamResult' => $this->sSpamResult,
			'IsSpam' => $this->bIsSpam,
			'HasVirus' => $this->bHasVirus,
//			'VirusScanned' => $this->sVirusScanned,
			'DateTimeStampInUTC' => $this->iInternalTimeStampInUTC,

			// \MailSo\Mime\EmailCollection
			'From' => $this->oFrom,
			'ReplyTo' => $this->oReplyTo,
			'To' => $this->oTo,
			'Cc' => $this->oCc,
			'Bcc' => $this->oBcc,
			'Sender' => $this->oSender,
			'DeliveredTo' => $this->oDeliveredTo,

			'Priority' => $this->iPriority,
			'Threads' => $this->aThreads,
			'UnsubsribeLinks' => $this->aUnsubsribeLinks,
			'ReadReceipt' => '',
			'Autocrypt' => $this->sAutocrypt,

			'Attachments' => $this->oAttachments,

			'Flags' => $aFlags,

			// https://datatracker.ietf.org/doc/html/rfc8621#section-4.1.1
			'id' => $this->sEmailId,
//			'blobId' => $this->sEmailIdBlob,
			'threadId' => $this->sThreadId,
//			'mailboxIds' => ['mailboxid'=>true],
//			'keywords' => $keywords,
			'size' => $this->iSize,
			'receivedAt' => \gmdate('Y-m-d\\TH:i:s\\Z', $this->iInternalTimeStampInUTC)
		);
	}
}
