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

use MailSo\Base\Utils;
use MailSo\Imap\Enumerations\FetchType;

/**
 * @category MailSo
 * @package Mail
 */
class Message implements \JsonSerializable
{
	private string
		$sFolder = '',
		$sSubject = '',
		$sMessageId = '',
		$sContentType = '',
		$sSpamResult = '',
		$sVirusScanned = '',
		$InReplyTo = '',
		$sPlain = '',
		$sHtml = '',
		$References = '',
		$sDeliveryReceipt = '',
		$ReadReceipt = '';

	private ?string
		/**
		 * https://www.rfc-editor.org/rfc/rfc8474#section-5
		 */
		$sEmailId = null,
		$sThreadId = null,
		// https://autocrypt.org/level1.html#the-autocrypt-header
		$sAutocrypt = '';

	private int
		$Uid = 0,
		$iSize = 0,
		$SpamScore = 0,
		$iInternalTimeStampInUTC = 0,
		$HeaderTimeStampInUTC = 0,
		$iPriority = \MailSo\Mime\Enumerations\MessagePriority::NORMAL;

	private bool
		$bIsSpam = false;

	private ?bool
		/**
		 * null = not scanned
		 * true = scanned and infected
		 * false = scanned and no infection found
		 */
		$bHasVirus = null;

	private array
		$SPF = [],
		$DKIM = [],
		$DMARC = [],
//		$aFlags = [],
		$aFlagsLowerCase = [],
		$UnsubsribeLinks = [],
		$aThreads = [];

	private ?array $DraftInfo = null;
	private ?array $pgpSigned = null;
	private ?array $pgpEncrypted = null;

	private ?\MailSo\Mime\EmailCollection
		$oFrom = null,
		$oSender = null,
		$oReplyTo = null,
		$oDeliveredTo = null,
		$oTo = null,
		$oCc = null,
		$oBcc = null;

	private ?AttachmentCollection
		$Attachments = null;

	function __get($k)
	{
		return \property_exists($this, $k) ? $this->$k : null;
	}

	public function Subject() : string
	{
		return $this->sSubject;
	}

	public function From() : ?\MailSo\Mime\EmailCollection
	{
		return $this->oFrom;
	}

	public function Uid() : int
	{
		return $this->Uid;
	}

	public function HeaderTimeStampInUTC() : int
	{
		return $this->HeaderTimeStampInUTC;
	}

	public function Attachments() : ?AttachmentCollection
	{
		return $this->Attachments;
	}

	public function Plain() : string
	{
		return $this->sPlain;
	}

	public function Html() : string
	{
		return $this->sHtml;
	}

	private function setSpamScore($value) : void
	{
		$this->SpamScore = \intval(\max(0, \min(100, $value)));
	}

	public function SetThreads(array $aThreads)
	{
		$this->aThreads = $aThreads;
	}

	public static function fromFetchResponse(string $sFolder, \MailSo\Imap\FetchResponse $oFetchResponse, ?\MailSo\Imap\BodyStructure $oBodyStructure = null) : self
	{
		$oMessage = new self;

		if (!$oBodyStructure) {
			$oBodyStructure = $oFetchResponse->GetFetchBodyStructure();
		}

		$aFlags = $oFetchResponse->GetFetchValue(FetchType::FLAGS) ?: [];

		$oMessage->sFolder = $sFolder;
		$oMessage->Uid = (int) $oFetchResponse->GetFetchValue(FetchType::UID);
		$oMessage->iSize = (int) $oFetchResponse->GetFetchValue(FetchType::RFC822_SIZE);
//		$oMessage->aFlags = $aFlags;
		$oMessage->aFlagsLowerCase = \array_map('mb_strtolower', \array_map('\\MailSo\\Base\\Utils::Utf7ModifiedToUtf8', $aFlags));
		$oMessage->iInternalTimeStampInUTC = \MailSo\Base\DateTimeHelper::ParseInternalDateString(
			$oFetchResponse->GetFetchValue(FetchType::INTERNALDATE)
		);

		// https://www.rfc-editor.org/rfc/rfc8474
		$aEmailId = $oFetchResponse->GetFetchValue(FetchType::EMAILID);
		$oMessage->sEmailId = $aEmailId ? $aEmailId[0] : $oFetchResponse->GetFetchValue('X-GM-MSGID');
//		$oMessage->sEmailId = $oMessage->sEmailId ?: $oFetchResponse->GetFetchValue('X-GUID');
		$aThreadId = $oFetchResponse->GetFetchValue(FetchType::THREADID);
		$oMessage->sThreadId = $aThreadId ? $aThreadId[0] : $oFetchResponse->GetFetchValue('X-GM-THRID');

		$sCharset = $oBodyStructure ? Utils::NormalizeCharset($oBodyStructure->SearchCharset()) : '';

		$sHeaders = $oFetchResponse->GetHeaderFieldsValue();
		$oHeaders = \strlen($sHeaders) ? new \MailSo\Mime\HeaderCollection($sHeaders, false, $sCharset) : null;
		if ($oHeaders) {
			$sContentTypeCharset = $oHeaders->ParameterValue(
				\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
				\MailSo\Mime\Enumerations\Parameter::CHARSET
			);

			if (\strlen($sContentTypeCharset)) {
				$sCharset = Utils::NormalizeCharset($sContentTypeCharset);
			}

			if (\strlen($sCharset)) {
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

			$oMessage->oSender = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::SENDER, $bCharsetAutoDetect);
			$oMessage->oReplyTo = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::REPLY_TO, $bCharsetAutoDetect);
			$oMessage->oDeliveredTo = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::DELIVERED_TO, $bCharsetAutoDetect);

			$oMessage->InReplyTo = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::IN_REPLY_TO);
			$oMessage->References = Utils::StripSpaces(
				$oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::REFERENCES));

			$oMessage->HeaderTimeStampInUTC = \MailSo\Base\DateTimeHelper::ParseRFC2822DateString(
				$oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::DATE)
			);

			// Priority
			$sPriority = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_MSMAIL_PRIORITY)
				?: $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::IMPORTANCE)
				?: $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_PRIORITY);
			if (\strlen($sPriority)) {
				switch (\substr(\trim($sPriority), 0, 1))
				{
					case 'h':
					case '1':
					case '2':
						$oMessage->iPriority = \MailSo\Mime\Enumerations\MessagePriority::HIGH;
						break;

					case 'l':
					case '4':
					case '5':
						$oMessage->iPriority = \MailSo\Mime\Enumerations\MessagePriority::LOW;
						break;
				}
			}

			// Delivery Receipt
			$oMessage->sDeliveryReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::RETURN_RECEIPT_TO));

			// Read Receipt
			$oMessage->ReadReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::DISPOSITION_NOTIFICATION_TO));
			if (empty($oMessage->ReadReceipt)) {
				$oMessage->ReadReceipt = \trim($oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::X_CONFIRM_READING_TO));
			}

			// Unsubscribe links
			$UnsubsribeLinks = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::LIST_UNSUBSCRIBE);
			if ($UnsubsribeLinks) {
				$oMessage->UnsubsribeLinks = \array_map(
					function ($link) {
						return trim($link, ' <>');
					},
					\explode(',', $UnsubsribeLinks)
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
					$oMessage->DraftInfo = array($sType, $iUid, $sFolder);
				}
			}

			$aAuth = $oHeaders->AuthStatuses();
			$oMessage->SPF = $aAuth['spf'];
			$oMessage->DKIM = $aAuth['dkim'];
			$oMessage->DMARC = $aAuth['dmarc'];
			if ($aAuth['dkim'] && $oMessage->oFrom) {
				foreach ($oMessage->oFrom as $oEmail) {
					$sEmail = $oEmail->GetEmail();
					foreach ($aAuth['dkim'] as $aDkimData) {
						if (\strpos($sEmail, $aDkimData[1])) {
							$oEmail->SetDkimStatus($aDkimData[0]);
						}
					}
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
			$oMessage->InReplyTo = $oFetchResponse->GetFetchEnvelopeValue(8, '');
		}

		if ($oBodyStructure) {
			$gEncryptedParts = $oBodyStructure->SearchByContentType('multipart/encrypted');
			foreach ($gEncryptedParts as $oPart) {
				if ($oPart->IsPgpEncrypted()) {
					$oMessage->pgpEncrypted = [
						'partId' => $oPart->SubParts()[1]->PartID()
					];
				}
			}

			$gSignatureParts = $oBodyStructure->SearchByContentType('multipart/signed');
			foreach ($gSignatureParts as $oPart) {
				if (!$oPart->IsPgpSigned()) {
					continue;
				}
				$oPgpSignaturePart = $oPart->SubParts()[1];
				$oMessage->pgpSigned = [
					// /?/Raw/&q[]=/0/Download/&q[]=/...
					// /?/Raw/&q[]=/0/View/&q[]=/...
					'bodyPartId' => $oPart->SubParts()[0]->PartID(),
					'sigPartId' => $oPgpSignaturePart->PartID(),
					'micAlg' => $oHeaders ? (string) $oHeaders->ParameterValue(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, 'micalg') : ''
				];
/*
				// An empty section specification refers to the entire message, including the header.
				// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
				$sPgpText = \trim(
					\trim($oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->pgpSigned['bodyPartId'].'.MIME]'))
					. "\r\n\r\n"
					. \trim($oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->pgpSigned['bodyPartId'].']'))
				);
				if ($sPgpText) {
					$oMessage->pgpSigned['Body'] = $sPgpText;
				}
				$sPgpSignatureText = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->pgpSigned['sigPartId'].']');
				if ($sPgpSignatureText && 0 < \strpos($sPgpSignatureText, 'BEGIN PGP SIGNATURE')) {
					$oMessage->pgpSigned['Signature'] = $oPart->SubParts()[0]->PartID();
				}
*/
				break;
			}

			$aTextParts = $oBodyStructure->GetHtmlAndPlainParts();
			if ($aTextParts) {
				$sCharset = $sCharset ?: \MailSo\Base\Enumerations\Charset::UTF_8;

				$aHtmlParts = array();
				$aPlainParts = array();

				foreach ($aTextParts as $oPart) {
					$sText = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oPart->PartID().']');
					if (null === $sText) {
						// TextPartIsTrimmed ?
						$sText = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oPart->PartID().']<0>');
					}

					if (\is_string($sText) && \strlen($sText)) {
						$sText = Utils::DecodeEncodingValue($sText, $oPart->MailEncodingName());
						$sText = Utils::ConvertEncoding($sText,
							Utils::NormalizeCharset($oPart->Charset() ?: $sCharset, true),
							\MailSo\Base\Enumerations\Charset::UTF_8
						);
						$sText = Utils::Utf8Clear($sText);

						// https://datatracker.ietf.org/doc/html/rfc4880#section-7
						// Cleartext Signature
						if (!$oMessage->pgpSigned && \str_contains($sText, '-----BEGIN PGP SIGNED MESSAGE-----')) {
							$oMessage->pgpSigned = [
								'bodyPartId' => $oPart->PartID()
							];
						}

						if (\str_contains($sText, '-----BEGIN PGP MESSAGE-----')) {
							$keyIds = [];
							if (\SnappyMail\PGP\GPG::isSupported()) {
								$GPG = new \SnappyMail\PGP\GPG('');
								$keyIds = $GPG->getEncryptedMessageKeys($sText);
							}
							$oMessage->pgpEncrypted = [
								'partId' => $oPart->PartID(),
								'keyIds' => $keyIds
							];
						}

						if ('text/html' === $oPart->ContentType()) {
							$aHtmlParts[] = $sText;
						} else {
							if ($oPart->IsFlowedFormat()) {
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
			if ($gAttachmentsParts->valid()) {
				$oMessage->Attachments = new AttachmentCollection;
				foreach ($gAttachmentsParts as /* @var $oAttachmentItem \MailSo\Imap\BodyStructure */ $oAttachmentItem) {
//					if ('application/pgp-keys' === $oAttachmentItem->ContentType()) import ???
					$oMessage->Attachments->append(
						new Attachment($oMessage->sFolder, $oMessage->Uid, $oAttachmentItem)
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
			'folder' => $this->sFolder,
			'uid' => $this->Uid,
			'subject' => \trim(Utils::Utf8Clear($this->sSubject)),
			'encrypted' => 'multipart/encrypted' == $this->sContentType || $this->pgpEncrypted,
			'messageId' => $this->sMessageId,
			'spamScore' => $this->bIsSpam ? 100 : $this->SpamScore,
			'spamResult' => $this->sSpamResult,
			'isSpam' => $this->bIsSpam,
			'hasVirus' => $this->bHasVirus,
//			'virusScanned' => $this->sVirusScanned,
			'dateTimeStampInUTC' => $this->iInternalTimeStampInUTC,

			// \MailSo\Mime\EmailCollection
			'from' => $this->oFrom,
			'replyTo' => $this->oReplyTo,
			'to' => $this->oTo,
			'cc' => $this->oCc,
			'bcc' => $this->oBcc,
			'sender' => $this->oSender,
			'deliveredTo' => $this->oDeliveredTo,

			'priority' => $this->iPriority,
			'threads' => $this->aThreads,
			'unsubsribeLinks' => $this->UnsubsribeLinks,
			'readReceipt' => '',
			'autocrypt' => $this->sAutocrypt,

			'attachments' => $this->Attachments,

			'spf' => $this->SPF,
			'dkim' => $this->DKIM,
			'dmarc' => $this->DMARC,

			'flags' => $aFlags,

			'inReplyTo' => $this->InReplyTo,

			// https://datatracker.ietf.org/doc/html/rfc8621#section-4.1.1
			'id' => $this->sEmailId,
//			'blobId' => $this->sEmailIdBlob,
			'threadId' => $this->sThreadId,
//			'mailboxIds' => ['mailboxid'=>true],
//			'keywords' => $keywords,
			'size' => $this->iSize
		);
	}
}
