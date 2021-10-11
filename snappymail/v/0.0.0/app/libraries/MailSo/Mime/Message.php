<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
 */
class Message
{
	/**
	 * @var array
	 */
	private $aHeadersValue = array();

	/**
	 * @var array
	 */
	private $aAlternativeParts = array();

	/**
	 * @var AttachmentCollection
	 */
	private $oAttachmentCollection;

	/**
	 * @var bool
	 */
	private $bAddEmptyTextPart = true;

	/**
	 * @var bool
	 */
	private $bAddDefaultXMailer = true;

	function __construct()
	{
		$this->oAttachmentCollection = new AttachmentCollection;
	}

	public function DoesNotCreateEmptyTextPart() : self
	{
		$this->bAddEmptyTextPart = false;

		return $this;
	}

	public function DoesNotAddDefaultXMailer() : self
	{
		$this->bAddDefaultXMailer = false;

		return $this;
	}

	public function MessageId() : string
	{
		$sResult = '';
		if (!empty($this->aHeadersValue[Enumerations\Header::MESSAGE_ID]))
		{
			$sResult = $this->aHeadersValue[Enumerations\Header::MESSAGE_ID];
		}
		return $sResult;
	}

	public function SetMessageId(string $sMessageId) : void
	{
		$this->aHeadersValue[Enumerations\Header::MESSAGE_ID] = $sMessageId;
	}

	public function RegenerateMessageId(string $sHostName = '') : void
	{
		$this->SetMessageId($this->generateNewMessageId($sHostName));
	}

	public function Attachments() : AttachmentCollection
	{
		return $this->oAttachmentCollection;
	}

	public function GetSubject() : string
	{
		return isset($this->aHeadersValue[Enumerations\Header::SUBJECT]) ?
			$this->aHeadersValue[Enumerations\Header::SUBJECT] : '';
	}

	public function GetFrom() : ?Email
	{
		if (isset($this->aHeadersValue[Enumerations\Header::FROM_]) &&
			$this->aHeadersValue[Enumerations\Header::FROM_] instanceof Email)
		{
			return $this->aHeadersValue[Enumerations\Header::FROM_];
		}

		return null;
	}

	public function GetTo() : EmailCollection
	{
		if (isset($this->aHeadersValue[Enumerations\Header::TO_]) &&
			$this->aHeadersValue[Enumerations\Header::TO_] instanceof EmailCollection)
		{
			return $this->aHeadersValue[Enumerations\Header::TO_]->Unique();
		}

		return new EmailCollection;
	}

	public function GetBcc() : ?EmailCollection
	{
		if (isset($this->aHeadersValue[Enumerations\Header::BCC]) &&
			$this->aHeadersValue[Enumerations\Header::BCC] instanceof EmailCollection)
		{
			return $this->aHeadersValue[Enumerations\Header::BCC]->Unique();
		}

		return null;
	}

	public function GetRcpt() : EmailCollection
	{
		$oResult = new EmailCollection;

		$headers = array(Enumerations\Header::TO_, Enumerations\Header::CC, Enumerations\Header::BCC);
		foreach ($headers as $header) {
			if (isset($this->aHeadersValue[$header]) && $this->aHeadersValue[$header] instanceof EmailCollection) {
				foreach ($this->aHeadersValue[$header] as $oEmail) {
					$oResult->append($oEmail);
				}
			}
		}

/*
		$aReturn = array();
		$headers = array(Enumerations\Header::TO_, Enumerations\Header::CC, Enumerations\Header::BCC);
		foreach ($headers as $header) {
			if (isset($this->aHeadersValue[$header]) && $this->aHeadersValue[$header] instanceof EmailCollection) {
				foreach ($this->aHeadersValue[$header] as $oEmail) {
					$oResult->append($oEmail);
					$sEmail = $oEmail->GetEmail();
					if (!isset($aReturn[$sEmail])) {
						$aReturn[$sEmail] = $oEmail;
					}
				}
			}
		}
		return new EmailCollection($aReturn);
*/

		return $oResult->Unique();
	}

	public function SetCustomHeader(string $sHeaderName, string $sValue) : self
	{
		$sHeaderName = \trim($sHeaderName);
		if (0 < \strlen($sHeaderName))
		{
			$this->aHeadersValue[$sHeaderName] = $sValue;
		}

		return $this;
	}

	public function SetSubject(string $sSubject) : self
	{
		$this->aHeadersValue[Enumerations\Header::SUBJECT] = $sSubject;

		return $this;
	}

	public function SetInReplyTo(string $sInReplyTo) : self
	{
		$this->aHeadersValue[Enumerations\Header::IN_REPLY_TO] = $sInReplyTo;

		return $this;
	}

	public function SetReferences(string $sReferences) : self
	{
		$this->aHeadersValue[Enumerations\Header::REFERENCES] =
			\MailSo\Base\Utils::StripSpaces($sReferences);

		return $this;
	}

	public function SetReadReceipt(string $sEmail) : self
	{
		$this->aHeadersValue[Enumerations\Header::DISPOSITION_NOTIFICATION_TO] = $sEmail;
		$this->aHeadersValue[Enumerations\Header::X_CONFIRM_READING_TO] = $sEmail;

		return $this;
	}

	public function SetReadConfirmation(string $sEmail) : self
	{
		return $this->SetReadReceipt($sEmail);
	}

	public function SetPriority(int $iValue) : self
	{
		$sResult = '';
		switch ($iValue)
		{
			case Enumerations\MessagePriority::HIGH:
				$sResult = Enumerations\MessagePriority::HIGH.' (Highest)';
				break;
			case Enumerations\MessagePriority::NORMAL:
				$sResult = Enumerations\MessagePriority::NORMAL.' (Normal)';
				break;
			case Enumerations\MessagePriority::LOW:
				$sResult = Enumerations\MessagePriority::LOW.' (Lowest)';
				break;
		}

		if (0 < \strlen($sResult))
		{
			$this->aHeadersValue[Enumerations\Header::X_PRIORITY] = $sResult;
		}

		return $this;
	}

	public function SetSensitivity(int $iValue) : self
	{
		$sResult = '';
		switch ($iValue)
		{
			case Enumerations\Sensitivity::CONFIDENTIAL:
				$sResult = 'Company-Confidential';
				break;
			case Enumerations\Sensitivity::PERSONAL:
				$sResult = 'Personal';
				break;
			case Enumerations\Sensitivity::PRIVATE_:
				$sResult = 'Private';
				break;
		}

		if (0 < \strlen($sResult))
		{
			$this->aHeadersValue[Enumerations\Header::SENSITIVITY] = $sResult;
		}

		return $this;
	}

	public function SetXMailer(string $sXMailer) : self
	{
		$this->aHeadersValue[Enumerations\Header::X_MAILER] = $sXMailer;

		return $this;
	}

	public function SetFrom(Email $oEmail) : self
	{
		$this->aHeadersValue[Enumerations\Header::FROM_] = $oEmail;

		return $this;
	}

	public function SetTo(EmailCollection $oEmails) : self
	{
		$this->aHeadersValue[Enumerations\Header::TO_] = $oEmails;

		return $this;
	}

	public function SetDate(int $iDateTime) : self
	{
		$this->aHeadersValue[Enumerations\Header::DATE] = gmdate('r', $iDateTime);

		return $this;
	}

	public function SetReplyTo(EmailCollection $oEmails) : self
	{
		$this->aHeadersValue[Enumerations\Header::REPLY_TO] = $oEmails;

		return $this;
	}

	public function SetCc(EmailCollection $oEmails) : self
	{
		$this->aHeadersValue[Enumerations\Header::CC] = $oEmails;

		return $this;
	}

	public function SetBcc(EmailCollection $oEmails) : self
	{
		$this->aHeadersValue[Enumerations\Header::BCC] = $oEmails;

		return $this;
	}

	public function SetSender(Email $oEmail) : self
	{
		$this->aHeadersValue[Enumerations\Header::SENDER] = $oEmail;

		return $this;
	}

	public function SetDraftInfo(string $sType, int $iUid, string $sFolder) : self
	{
		$this->aHeadersValue[Enumerations\Header::X_DRAFT_INFO] = (new ParameterCollection)
			->Add(new Parameter('type', $sType))
			->Add(new Parameter('uid', $iUid))
			->Add(new Parameter('folder', \base64_encode($sFolder)))
		;

		return $this;
	}

	public function AddPlain(string $sPlain) : self
	{
		return $this->AddAlternative(Enumerations\MimeType::TEXT_PLAIN, $sPlain);
	}

	public function AddHtml(string $sHtml) : self
	{
		return $this->AddAlternative(Enumerations\MimeType::TEXT_HTML, $sHtml);
	}

	public function AddText(string $sHtmlOrPlainText, bool $bIsHtml = false) : self
	{
		return $bIsHtml ? $this->AddHtml($sHtmlOrPlainText) : $this->AddPlain($sHtmlOrPlainText);
	}

	public function AddAlternative(string $sContentType, string $sData) : self
	{
		$this->aAlternativeParts[] = array(
			$sContentType,
			\preg_replace('/\\r?\\n/', Enumerations\Constants::CRLF, \trim($sData)),
			\MailSo\Base\Enumerations\Encoding::QUOTED_PRINTABLE_LOWER,
			array()
		);
		return $this;
	}

	private function generateNewBoundary() : string
	{
		return '--='.\MailSo\Config::$BoundaryPrefix.
			\rand(100, 999).'_'.rand(100000000, 999999999).'.'.\time();
	}

	private function generateNewMessageId(string $sHostName = '') : string
	{
		if (0 === \strlen($sHostName))
		{
			$sHostName = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '';
		}

		if (empty($sHostName) && \MailSo\Base\Utils::FunctionExistsAndEnabled('php_uname'))
		{
			$sHostName = \php_uname('n');
		}

		if (empty($sHostName))
		{
			$sHostName = 'localhost';
		}

		return '<'.
			\MailSo\Base\Utils::Sha1Rand($sHostName.
				(\MailSo\Base\Utils::FunctionExistsAndEnabled('getmypid') ? \getmypid() : '')).'@'.$sHostName.'>';
	}

	private function createNewMessageAttachmentBody(Attachment $oAttachment) : Part
	{
		$oAttachmentPart = new Part;

		$sFileName = $oAttachment->FileName();
		$sCID = $oAttachment->CID();
		$sContentLocation = $oAttachment->ContentLocation();

		$oContentTypeParameters = null;
		$oContentDispositionParameters = null;

		if (0 < strlen(trim($sFileName)))
		{
			$oContentTypeParameters =
				(new ParameterCollection)->Add(new Parameter(
					Enumerations\Parameter::NAME, $sFileName));

			$oContentDispositionParameters =
				(new ParameterCollection)->Add(new Parameter(
					Enumerations\Parameter::FILENAME, $sFileName));
		}

		$oAttachmentPart->Headers->append(
			new Header(Enumerations\Header::CONTENT_TYPE,
				$oAttachment->ContentType().';'.
				(($oContentTypeParameters) ? ' '.$oContentTypeParameters->ToString() : '')
			)
		);

		$oAttachmentPart->Headers->append(
			new Header(Enumerations\Header::CONTENT_DISPOSITION,
				($oAttachment->IsInline() ? 'inline' : 'attachment').';'.
				(($oContentDispositionParameters) ? ' '.$oContentDispositionParameters->ToString() : '')
			)
		);

		if (0 < strlen($sCID))
		{
			$oAttachmentPart->Headers->append(
				new Header(Enumerations\Header::CONTENT_ID, $sCID)
			);
		}

		if (0 < strlen($sContentLocation))
		{
			$oAttachmentPart->Headers->append(
				new Header(Enumerations\Header::CONTENT_LOCATION, $sContentLocation)
			);
		}

		$oAttachmentPart->Body = $oAttachment->Resource();

		if ('message/rfc822' !== strtolower($oAttachment->ContentType()))
		{
			$oAttachmentPart->Headers->append(
				new Header(
					Enumerations\Header::CONTENT_TRANSFER_ENCODING,
					\MailSo\Base\Enumerations\Encoding::BASE64_LOWER
				)
			);

			if (is_resource($oAttachmentPart->Body))
			{
				if (!\MailSo\Base\StreamWrappers\Binary::IsStreamRemembed($oAttachmentPart->Body))
				{
					$oAttachmentPart->Body =
						\MailSo\Base\StreamWrappers\Binary::CreateStream($oAttachmentPart->Body,
							\MailSo\Base\StreamWrappers\Binary::GetInlineDecodeOrEncodeFunctionName(
								\MailSo\Base\Enumerations\Encoding::BASE64, false));

					\MailSo\Base\StreamWrappers\Binary::RememberStream($oAttachmentPart->Body);
				}
			}
		}

		return $oAttachmentPart;
	}

	private function createNewMessageAlternativePartBody(array $aAlternativeData) : ?Part
	{
		$oAlternativePart = null;

		if (isset($aAlternativeData[0]))
		{
			$oAlternativePart = new Part;
			$oParameters = new ParameterCollection;
			$oParameters->append(
				new Parameter(
					Enumerations\Parameter::CHARSET,
					\MailSo\Base\Enumerations\Charset::UTF_8)
			);

			if (isset($aAlternativeData[3]) && \is_array($aAlternativeData[3]) && 0 < \count($aAlternativeData[3]))
			{
				foreach ($aAlternativeData[3] as $sName => $sValue)
				{
					$oParameters->append(new Parameter($sName, $sValue));
				}
			}

			$oAlternativePart->Headers->append(
				new Header(Enumerations\Header::CONTENT_TYPE,
					$aAlternativeData[0].'; '.$oParameters->ToString())
			);

			$oAlternativePart->Body = null;
			if (isset($aAlternativeData[1]))
			{
				if (is_resource($aAlternativeData[1]))
				{
					$oAlternativePart->Body = $aAlternativeData[1];
				}
				else if (is_string($aAlternativeData[1]) && 0 < strlen($aAlternativeData[1]))
				{
					$oAlternativePart->Body =
						\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($aAlternativeData[1]);
				}
			}

			if (isset($aAlternativeData[2]) && 0 < strlen($aAlternativeData[2]))
			{
				$oAlternativePart->Headers->append(
					new Header(Enumerations\Header::CONTENT_TRANSFER_ENCODING,
						$aAlternativeData[2]
					)
				);

				if (is_resource($oAlternativePart->Body))
				{
					if (!\MailSo\Base\StreamWrappers\Binary::IsStreamRemembed($oAlternativePart->Body))
					{
						$oAlternativePart->Body =
							\MailSo\Base\StreamWrappers\Binary::CreateStream($oAlternativePart->Body,
								\MailSo\Base\StreamWrappers\Binary::GetInlineDecodeOrEncodeFunctionName(
									$aAlternativeData[2], false));

						\MailSo\Base\StreamWrappers\Binary::RememberStream($oAlternativePart->Body);
					}
				}
			}

			if (!is_resource($oAlternativePart->Body))
			{
				$oAlternativePart->Body =
					\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString('');
			}
		}

		return $oAlternativePart;
	}

	private function createNewMessageSimpleOrAlternativeBody() : Part
	{
		$oResultPart = null;
		if (1 < \count($this->aAlternativeParts))
		{
			$oResultPart = new Part;

			$oResultPart->Headers->append(
				new Header(Enumerations\Header::CONTENT_TYPE,
					Enumerations\MimeType::MULTIPART_ALTERNATIVE.'; '.
					(new ParameterCollection)->Add(
						new Parameter(
							Enumerations\Parameter::BOUNDARY,
							$this->generateNewBoundary())
					)->ToString()
				)
			);

			foreach ($this->aAlternativeParts as $aAlternativeData)
			{
				$oAlternativePart = $this->createNewMessageAlternativePartBody($aAlternativeData);
				if ($oAlternativePart)
				{
					$oResultPart->SubParts->append($oAlternativePart);
				}

				unset($oAlternativePart);
			}

		}
		else if (1 === count($this->aAlternativeParts))
		{
			$oAlternativePart = $this->createNewMessageAlternativePartBody($this->aAlternativeParts[0]);
			if ($oAlternativePart)
			{
				$oResultPart = $oAlternativePart;
			}
		}

		if (!$oResultPart)
		{
			if ($this->bAddEmptyTextPart)
			{
				$oResultPart = $this->createNewMessageAlternativePartBody(array(
					Enumerations\MimeType::TEXT_PLAIN, null
				));
			}
			else
			{
				$aAttachments = $this->oAttachmentCollection->getArrayCopy();
				if (1 === count($aAttachments) && isset($aAttachments[0]))
				{
					$this->oAttachmentCollection->Clear();

					$oResultPart = $this->createNewMessageAlternativePartBody(array(
						$aAttachments[0]->ContentType(), $aAttachments[0]->Resource(),
							'', $aAttachments[0]->CustomContentTypeParams()
					));
				}
			}
		}

		return $oResultPart;
	}

	private function createNewMessageRelatedBody(Part $oIncPart) : Part
	{
		$oResultPart = null;

		$aAttachments = $this->oAttachmentCollection->LinkedAttachments();
		if (0 < count($aAttachments))
		{
			$oResultPart = new Part;

			$oResultPart->Headers->append(
				new Header(Enumerations\Header::CONTENT_TYPE,
					Enumerations\MimeType::MULTIPART_RELATED.'; '.
					(new ParameterCollection)->Add(
						new Parameter(
							Enumerations\Parameter::BOUNDARY,
							$this->generateNewBoundary())
					)->ToString()
				)
			);

			$oResultPart->SubParts->append($oIncPart);

			foreach ($aAttachments as $oAttachment)
			{
				$oResultPart->SubParts->append($this->createNewMessageAttachmentBody($oAttachment));
			}
		}
		else
		{
			$oResultPart = $oIncPart;
		}

		return $oResultPart;
	}

	private function createNewMessageMixedBody(Part $oIncPart) : Part
	{
		$oResultPart = null;

		$aAttachments = $this->oAttachmentCollection->UnlinkedAttachments();
		if (0 < count($aAttachments))
		{
			$oResultPart = new Part;

			$oResultPart->Headers->AddByName(Enumerations\Header::CONTENT_TYPE,
				Enumerations\MimeType::MULTIPART_MIXED.'; '.
				(new ParameterCollection)->Add(
					new Parameter(
						Enumerations\Parameter::BOUNDARY,
						$this->generateNewBoundary())
				)->ToString()
			);

			$oResultPart->SubParts->append($oIncPart);

			foreach ($aAttachments as $oAttachment)
			{
				$oResultPart->SubParts->append($this->createNewMessageAttachmentBody($oAttachment));
			}
		}
		else
		{
			$oResultPart = $oIncPart;
		}

		return $oResultPart;
	}

	private function setDefaultHeaders(Part $oIncPart, bool $bWithoutBcc = false) : Part
	{
		if (!isset($this->aHeadersValue[Enumerations\Header::DATE]))
		{
			$oIncPart->Headers->SetByName(Enumerations\Header::DATE, \gmdate('r'), true);
		}

		if (!isset($this->aHeadersValue[Enumerations\Header::MESSAGE_ID]))
		{
			$oIncPart->Headers->SetByName(Enumerations\Header::MESSAGE_ID, $this->generateNewMessageId(), true);
		}

		if (!isset($this->aHeadersValue[Enumerations\Header::X_MAILER]) && $this->bAddDefaultXMailer)
		{
			$oIncPart->Headers->SetByName(Enumerations\Header::X_MAILER, 'MailSo/2.0.1-djmaze', true);
		}

		if (!isset($this->aHeadersValue[Enumerations\Header::MIME_VERSION]))
		{
			$oIncPart->Headers->SetByName(Enumerations\Header::MIME_VERSION, '1.0', true);
		}

		foreach ($this->aHeadersValue as $sName => $mValue)
		{
			if (\is_object($mValue))
			{
				if ($mValue instanceof EmailCollection || $mValue instanceof Email ||
					$mValue instanceof ParameterCollection)
				{
					$mValue = $mValue->ToString();
				}
			}

			if (!($bWithoutBcc && \strtolower(Enumerations\Header::BCC) === \strtolower($sName)))
			{
				$oIncPart->Headers->SetByName($sName, (string) $mValue);
			}
		}

		return $oIncPart;
	}

	public function ToPart(bool $bWithoutBcc = false) : Part
	{
		$oPart = $this->createNewMessageSimpleOrAlternativeBody();
		$oPart = $this->createNewMessageRelatedBody($oPart);
		$oPart = $this->createNewMessageMixedBody($oPart);
		$oPart = $this->setDefaultHeaders($oPart, $bWithoutBcc);

		return $oPart;
	}

	/**
	 * @return resource
	 */
	public function ToStream(bool $bWithoutBcc = false)
	{
		return $this->ToPart($bWithoutBcc)->ToStream();
	}

	public function ToString(bool $bWithoutBcc = false) : string
	{
		return \stream_get_contents($this->ToStream($bWithoutBcc));
	}
}
