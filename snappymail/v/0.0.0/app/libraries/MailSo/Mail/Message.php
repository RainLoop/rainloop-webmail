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
use MailSo\Mime\Enumerations\Header as MimeHeader;
use SnappyMail\GPG\PGP as GPG;

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
		$InReplyTo = '',
		$sPlain = '',
		$sHtml = '',
		$References = '',
		$ReadReceipt = '';

	private ?string
		/**
		 * https://www.rfc-editor.org/rfc/rfc8474#section-5
		 */
		$sEmailId = null,
		$sThreadId = null,
		/**
		 * https://www.rfc-editor.org/rfc/rfc8970
		 */
		$sPreview = null;

	private int
		$Uid = 0,
		$iSize = 0,
		$SpamScore = 0,
		$iInternalTimeStampInUTC = 0,
		$iHeaderTimeStampInUTC = 0;

	private bool
		$bIsSpam = false;

	private array
		$SPF = [],
		$DKIM = [],
		$DMARC = [],
//		$aFlags = [],
		$aFlagsLowerCase = [],
		$aThreadUIDs = [],
		$aThreadUnseenUIDs = [];

	private ?array $DraftInfo = null;

	private ?array $pgpSigned = null;
	private ?array $pgpEncrypted = null;

	public ?array $smimeSigned = null;
	private ?array $smimeEncrypted = null;

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

	private ?\MailSo\Mime\HeaderCollection
		$Headers = null;

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

	public function Attachments() : ?AttachmentCollection
	{
		return $this->Attachments;
	}

	private function setSpamScore($value) : void
	{
		$this->SpamScore = \intval(\max(0, \min(100, $value)));
	}

	public function SetThreads(array $aThreadUIDs)
	{
		$this->aThreadUIDs = $aThreadUIDs;
	}

	public function SetThreadUnseen(array $aUnseenUIDs)
	{
		$this->aThreadUnseenUIDs = $aUnseenUIDs;
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
		$oMessage->sPreview = $oFetchResponse->GetFetchValue(FetchType::PREVIEW) ?: null;
		$sCharset = $oBodyStructure ? Utils::NormalizeCharset($oBodyStructure->SearchCharset()) : '';

		$sHeaders = $oFetchResponse->GetHeaderFieldsValue();
		$oHeaders = \strlen($sHeaders) ? new \MailSo\Mime\HeaderCollection($sHeaders, $sCharset) : null;
		if ($oHeaders) {
			$oMessage->Headers = $oHeaders;

			$sContentTypeCharset = $oHeaders->ParameterValue(
				MimeHeader::CONTENT_TYPE,
				\MailSo\Mime\Enumerations\Parameter::CHARSET
			);
			if (\strlen($sContentTypeCharset)) {
				$sCharset = Utils::NormalizeCharset($sContentTypeCharset);
			}
			if (\strlen($sCharset)) {
				$oHeaders->SetParentCharset($sCharset);
			}

			$bCharsetAutoDetect = !\strlen($sCharset);

			$oMessage->sSubject = $oHeaders->ValueByName(MimeHeader::SUBJECT, $bCharsetAutoDetect);
			$oMessage->sMessageId = $oHeaders->ValueByName(MimeHeader::MESSAGE_ID);
			$oMessage->sContentType = $oHeaders->ValueByName(MimeHeader::CONTENT_TYPE);

			$oMessage->oFrom = $oHeaders->GetAsEmailCollection(MimeHeader::FROM_);
			$oMessage->oTo = $oHeaders->GetAsEmailCollection(MimeHeader::TO_);
			$oMessage->oCc = $oHeaders->GetAsEmailCollection(MimeHeader::CC);
			$oMessage->oBcc = $oHeaders->GetAsEmailCollection(MimeHeader::BCC);

			$oMessage->oSender = $oHeaders->GetAsEmailCollection(MimeHeader::SENDER);
			$oMessage->oReplyTo = $oHeaders->GetAsEmailCollection(MimeHeader::REPLY_TO);
			$oMessage->oDeliveredTo = $oHeaders->GetAsEmailCollection(MimeHeader::DELIVERED_TO);

			$oMessage->InReplyTo = $oHeaders->ValueByName(MimeHeader::IN_REPLY_TO);
			$oMessage->References = Utils::StripSpaces(
				$oHeaders->ValueByName(MimeHeader::REFERENCES));

			$oMessage->iHeaderTimeStampInUTC = \MailSo\Base\DateTimeHelper::ParseRFC2822DateString(
				$oHeaders->ValueByName(MimeHeader::DATE)
			);

			// Delivery Receipt
//			$oMessage->sDeliveryReceipt = \trim($oHeaders->ValueByName(MimeHeader::RETURN_RECEIPT_TO));

			// Read Receipt
			$sReadReceipt = \trim($oHeaders->ValueByName(MimeHeader::DISPOSITION_NOTIFICATION_TO));
			if (empty($sReadReceipt)) {
				$sReadReceipt = \trim($oHeaders->ValueByName(MimeHeader::X_CONFIRM_READING_TO));
			}
			if ($sReadReceipt) {
				try
				{
					if (!\MailSo\Mime\Email::Parse($sReadReceipt)) {
						$sReadReceipt = '';
					}
				}
				catch (\Throwable $oException)
				{
					$sReadReceipt = '';
				}
			}
			$oMessage->ReadReceipt = $sReadReceipt;

			if ($spam = $oHeaders->ValueByName(MimeHeader::X_SPAMD_RESULT)) {
				if (\preg_match('/\\[([\\d\\.-]+)\\s*\\/\\s*([\\d\\.]+)\\];/', $spam, $match)) {
					if ($threshold = \floatval($match[2])) {
						$oMessage->setSpamScore(100 * \floatval($match[1]) / $threshold);
						$oMessage->sSpamResult = "{$match[1]} / {$match[2]}";
					}
				}
				$oMessage->bIsSpam = false !== \stripos($oMessage->sSubject, '*** SPAM ***');
			} else if ($spam = $oHeaders->ValueByName(MimeHeader::X_BOGOSITY)) {
				$oMessage->sSpamResult = $spam;
				$oMessage->bIsSpam = !\str_contains($spam, 'Ham');
				if (\preg_match('/spamicity=([\\d\\.]+)/', $spam, $spamicity)) {
					$oMessage->setSpamScore(100 * \floatval($spamicity[1]));
				}
			} else if ($spam = $oHeaders->ValueByName(MimeHeader::X_SPAM_STATUS)) {
				$oMessage->sSpamResult = $spam;
				if (\preg_match('/(?:hits|score)=([\\d\\.-]+)/', $spam, $value)
				 && \preg_match('/required=([\\d\\.-]+)/', $spam, $required)) {
					if ($threshold = \floatval($required[1])) {
						$oMessage->setSpamScore(100 * \floatval($value[1]) / $threshold);
						$oMessage->sSpamResult = "{$value[1]} / {$required[1]}";
					}
				}
				// https://github.com/the-djmaze/snappymail/issues/1228
				else if (\preg_match('@([\\d\\.]+)/([\\d\\.]+)@', $spam, $value)
				  || \preg_match('@([\\d\\.]+)/([\\d\\.]+)@', $oHeaders->ValueByName(MimeHeader::X_SPAM_INFO), $value)
				) {
					$oMessage->sSpamResult = "{$value[1]} / {$value[2]}";
					$oMessage->setSpamScore(100 * \floatval($value[1]) / \floatval($value[2]));
				}

				$oMessage->bIsSpam = 'Yes' === \substr($spam, 0, 3)
					|| false !== \stripos($oHeaders->ValueByName(MimeHeader::X_SPAM_FLAG), 'YES');
			}

			$sDraftInfo = $oHeaders->ValueByName(MimeHeader::X_DRAFT_INFO);
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
				if ($oPart->isPgpEncrypted()) {
					$oMessage->pgpEncrypted = [
						'partId' => $oPart->SubParts()[1]->PartID()
					];
				}
			}

			$gEncryptedParts = $oBodyStructure->SearchByContentTypes(['application/pkcs7-mime','application/x-pkcs7-mime']);
			foreach ($gEncryptedParts as $oPart) {
				if ($oPart->isSMimeEncrypted()) {
					$oMessage->smimeEncrypted = [
						'partId' => $oPart->PartID()
					];
				} else if ($oPart->isSMimeSigned()) {
					$oMessage->smimeSigned = [
						'partId' => $oPart->PartID(),
						'micAlg' => $oHeaders ? (string) $oHeaders->ParameterValue(MimeHeader::CONTENT_TYPE, 'micalg') : '',
						'detached' => false
					];
				}
			}

			$gSignatureParts = $oBodyStructure->SearchByContentType('multipart/signed');
			foreach ($gSignatureParts as $oPart) {
				if ($oPart->isPgpSigned()) {
					$oMessage->pgpSigned = [
						// /?/Raw/&q[]=/0/Download/&q[]=/...
						// /?/Raw/&q[]=/0/View/&q[]=/...
						'partId' => $oPart->SubParts()[0]->PartID(),
						'sigPartId' => $oPart->SubParts()[1]->PartID(),
						'micAlg' => $oHeaders ? (string) $oHeaders->ParameterValue(MimeHeader::CONTENT_TYPE, 'micalg') : ''
					];
				} else if ($oPart->isSMimeSigned()) {
					$oMessage->smimeSigned = [
						'partId' => $oPart->PartID(),
						'sigPartId' => $oPart->SubParts()[1]->PartID(),
						'micAlg' => $oHeaders ? (string) $oHeaders->ParameterValue(MimeHeader::CONTENT_TYPE, 'micalg') : '',
						'detached' => true
					];
				}
/*
				// An empty section specification refers to the entire message, including the header.
				// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
				$sPgpText = \trim(
					\trim($oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->pgpSigned['partId'].'.MIME]'))
					. "\r\n\r\n"
					. \trim($oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->pgpSigned['partId'].']'))
				);
				if ($sPgpText) {
					$oMessage->pgpSigned['body'] = $sPgpText;
				}
				$sPgpSignatureText = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$oMessage->pgpSigned['sigPartId'].']');
				if ($sPgpSignatureText && 0 < \strpos($sPgpSignatureText, 'BEGIN PGP SIGNATURE')) {
					$oMessage->pgpSigned['signature'] = $oPart->SubParts()[0]->PartID();
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
								'partId' => $oPart->PartID()
							];
						}

						if (\str_contains($sText, '-----BEGIN PGP MESSAGE-----')) {
							$keyIds = [];
							if (GPG::isSupported()) {
								$GPG = new GPG('');
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

		if (\str_starts_with($oMessage->sSubject, '[Preview]')) {
			$oMessage->sSubject = \mb_substr($oMessage->sSubject, 10);
		}

		return $oMessage;
	}

	public function ETag(string $sClientHash) : string
	{
		return \md5('MessageHash/' . \implode('/', [
			$this->sFolder,
			$this->Uid,
			\implode(',', $this->getFlags()),
//			\implode(',', $this->aThreadUIDs),
			$sClientHash
		]));
	}

	// https://datatracker.ietf.org/doc/html/rfc5788#section-3.4.1
	// Thunderbird $label1 is same as $Important?
	// Thunderbird $label4 is same as $todo?
	protected function getFlags() : array
	{
		return \array_unique(\str_replace(
			['$readreceipt', '$replied',  /* 'junk',  'nonjunk',  '$queued',        '$sent',      'sent'*/],
			['$mdnsent',     '\\answered',/* '$junk', '$notjunk', '$submitpending', '$submitted', '$submitted'*/],
			$this->aFlagsLowerCase
		));
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
		$result = array(
			'@Object' => 'Object/Message',
			'folder' => $this->sFolder,
			'uid' => $this->Uid,
			'hash' => \md5($this->sFolder . $this->Uid),
			'subject' => \trim(Utils::Utf8Clear($this->sSubject)),
			'encrypted' => 'multipart/encrypted' == $this->sContentType || $this->pgpEncrypted || $this->smimeEncrypted,
			'messageId' => $this->sMessageId,
			'spamScore' => $this->bIsSpam ? 100 : $this->SpamScore,
			'spamResult' => $this->sSpamResult,
			'isSpam' => $this->bIsSpam,
			'dateTimestamp' => $this->iHeaderTimeStampInUTC ?: $this->iInternalTimeStampInUTC,
			'internalTimestamp' => $this->iInternalTimeStampInUTC,

			// \MailSo\Mime\EmailCollection
			'from' => $this->oFrom,
			'replyTo' => $this->oReplyTo,
			'to' => $this->oTo,
			'cc' => $this->oCc,
			'bcc' => $this->oBcc,
			'sender' => $this->oSender,
			'deliveredTo' => $this->oDeliveredTo,

			'readReceipt' => $this->ReadReceipt,

			'attachments' => $this->Attachments,

			'spf' => $this->SPF,
			'dkim' => $this->DKIM,
			'dmarc' => $this->DMARC,

			'flags' => $this->getFlags(),

			'inReplyTo' => $this->InReplyTo,

			// https://datatracker.ietf.org/doc/html/rfc8621#section-4.1.1
			'id' => $this->sEmailId,
//			'blobId' => $this->sEmailIdBlob,
//			'threadId' => $this->sThreadId,
//			'mailboxIds' => ['mailboxid'=>true],
//			'keywords' => $keywords,
			'size' => $this->iSize,

			'preview' => $this->sPreview,

			'headers' => $this->Headers
		);

		if ($this->DraftInfo) {
			$result['draftInfo'] = $this->DraftInfo;
		}
		if ($this->References) {
			$result['references'] = $this->References;
		}
		if ($this->sHtml || $this->sPlain) {
			$result['html'] = $this->sHtml;
			$result['plain'] = $this->sPlain;
		}
//		$this->GetCapa(Capa::OPENPGP) || $this->GetCapa(Capa::GNUPG)
		if ($this->pgpSigned) {
			$result['pgpSigned'] = $this->pgpSigned;
		}
		if ($this->pgpEncrypted) {
			$result['pgpEncrypted'] = $this->pgpEncrypted;
		}

		if ($this->smimeSigned) {
			$result['smimeSigned'] = $this->smimeSigned;
		}
		if ($this->smimeEncrypted) {
			$result['smimeEncrypted'] = $this->smimeEncrypted;
		}

		if ($this->aThreadUIDs) {
			$result['threads'] = $this->aThreadUIDs;
		}
		if ($this->aThreadUnseenUIDs) {
			$result['threadUnseen'] = $this->aThreadUnseenUIDs;
		}

		return $result;
	}
}
