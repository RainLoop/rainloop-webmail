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
	private $aHeadersValue;

	/**
	 * @var array
	 */
	private $aAlternativeParts;

	/**
	 * @var \MailSo\Mime\AttachmentCollection
	 */
	private $oAttachmentCollection;

	/**
	 * @var bool
	 */
	private $bAddEmptyTextPart;

	/**
	 * @var bool
	 */
	private $bAddDefaultXMailer;

	/**
	 * @access private
	 */
	private function __construct()
	{
		$this->aHeadersValue = array();
		$this->aAlternativeParts = array();
		$this->oAttachmentCollection = AttachmentCollection::NewInstance();
		$this->bAddEmptyTextPart = true;
		$this->bAddDefaultXMailer = true;
	}

	/**
	 * @return \MailSo\Mime\Message
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return \MailSo\Mime\Message
	 */
	public function DoesNotCreateEmptyTextPart()
	{
		$this->bAddEmptyTextPart = false;

		return $this;
	}

	/**
	 * @return \MailSo\Mime\Message
	 */
	public function DoesNotAddDefaultXMailer()
	{
		$this->bAddDefaultXMailer = false;

		return $this;
	}

	public function MessageId() : string
	{
		$sResult = '';
		if (!empty($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::MESSAGE_ID]))
		{
			$sResult = $this->aHeadersValue[\MailSo\Mime\Enumerations\Header::MESSAGE_ID];
		}
		return $sResult;
	}

	public function SetMessageId(string $sMessageId) : void
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::MESSAGE_ID] = $sMessageId;
	}

	public function RegenerateMessageId(string $sHostName = '') : void
	{
		$this->SetMessageId($this->generateNewMessageId($sHostName));
	}

	/**
	 * @return \MailSo\Mime\AttachmentCollection
	 */
	public function Attachments()
	{
		return $this->oAttachmentCollection;
	}

	public function GetSubject() : string
	{
		return isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::SUBJECT]) ?
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::SUBJECT] : '';
	}

	/**
	 * @return \MailSo\Mime\Email|null
	 */
	public function GetFrom()
	{
		$oResult = null;

		if (isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::FROM_]) &&
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::FROM_] instanceof \MailSo\Mime\Email)
		{
			$oResult = $this->aHeadersValue[\MailSo\Mime\Enumerations\Header::FROM_];
		}

		return $oResult;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function GetTo()
	{
		$oResult = \MailSo\Mime\EmailCollection::NewInstance();

		if (isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::TO_]) &&
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::TO_] instanceof \MailSo\Mime\EmailCollection)
		{
			$oResult->MergeWithOtherCollection($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::TO_]);
		}

		return $oResult->Unique();
	}

	/**
	 * @return \MailSo\Mime\EmailCollection|null
	 */
	public function GetBcc()
	{
		$oResult = null;

		if (isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::BCC]) &&
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::BCC] instanceof \MailSo\Mime\EmailCollection)
		{
			$oResult = $this->aHeadersValue[\MailSo\Mime\Enumerations\Header::BCC];
		}

		return $oResult ? $oResult->Unique() : null;
	}

	/**
	 * @return \MailSo\Mime\EmailCollection
	 */
	public function GetRcpt()
	{
		$oResult = \MailSo\Mime\EmailCollection::NewInstance();

		if (isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::TO_]) &&
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::TO_] instanceof \MailSo\Mime\EmailCollection)
		{
			$oResult->MergeWithOtherCollection($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::TO_]);
		}

		if (isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::CC]) &&
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::CC] instanceof \MailSo\Mime\EmailCollection)
		{
			$oResult->MergeWithOtherCollection($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::CC]);
		}

		if (isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::BCC]) &&
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::BCC] instanceof \MailSo\Mime\EmailCollection)
		{
			$oResult->MergeWithOtherCollection($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::BCC]);
		}

		return $oResult->Unique();
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetCustomHeader(string $sHeaderName, string $sValue)
	{
		$sHeaderName = \trim($sHeaderName);
		if (0 < \strlen($sHeaderName))
		{
			$this->aHeadersValue[$sHeaderName] = $sValue;
		}

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetSubject(string $sSubject)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::SUBJECT] = $sSubject;

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetInReplyTo(string $sInReplyTo)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::IN_REPLY_TO] = $sInReplyTo;

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetReferences(string $sReferences)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::REFERENCES] =
			\MailSo\Base\Utils::StripSpaces($sReferences);

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetReadReceipt(string $sEmail)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::DISPOSITION_NOTIFICATION_TO] = $sEmail;
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::X_CONFIRM_READING_TO] = $sEmail;

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetReadConfirmation(string $sEmail)
	{
		return $this->SetReadReceipt($sEmail);
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetPriority(int $iValue)
	{
		$sResult = '';
		switch ($iValue)
		{
			case \MailSo\Mime\Enumerations\MessagePriority::HIGH:
				$sResult = \MailSo\Mime\Enumerations\MessagePriority::HIGH.' (Highest)';
				break;
			case \MailSo\Mime\Enumerations\MessagePriority::NORMAL:
				$sResult = \MailSo\Mime\Enumerations\MessagePriority::NORMAL.' (Normal)';
				break;
			case \MailSo\Mime\Enumerations\MessagePriority::LOW:
				$sResult = \MailSo\Mime\Enumerations\MessagePriority::LOW.' (Lowest)';
				break;
		}

		if (0 < \strlen($sResult))
		{
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::X_PRIORITY] = $sResult;
		}

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetSensitivity(int $iValue)
	{
		$sResult = '';
		switch ($iValue)
		{
			case \MailSo\Mime\Enumerations\Sensitivity::CONFIDENTIAL:
				$sResult = 'Company-Confidential';
				break;
			case \MailSo\Mime\Enumerations\Sensitivity::PERSONAL:
				$sResult = 'Personal';
				break;
			case \MailSo\Mime\Enumerations\Sensitivity::PRIVATE_:
				$sResult = 'Private';
				break;
		}

		if (0 < \strlen($sResult))
		{
			$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::SENSITIVITY] = $sResult;
		}

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetXMailer(string $sXMailer)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::X_MAILER] = $sXMailer;

		return $this;
	}

	/**
	 * @param \MailSo\Mime\Email $oEmail
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetFrom(\MailSo\Mime\Email $oEmail)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::FROM_] = $oEmail;

		return $this;
	}

	/**
	 * @param \MailSo\Mime\EmailCollection $oEmails
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetTo(\MailSo\Mime\EmailCollection $oEmails)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::TO_] = $oEmails;

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetDate(int $iDateTime)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::DATE] = gmdate('r', $iDateTime);

		return $this;
	}

	/**
	 * @param \MailSo\Mime\EmailCollection $oEmails
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetReplyTo(\MailSo\Mime\EmailCollection $oEmails)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::REPLY_TO] = $oEmails;

		return $this;
	}

	/**
	 * @param \MailSo\Mime\EmailCollection $oEmails
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetCc(\MailSo\Mime\EmailCollection $oEmails)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::CC] = $oEmails;

		return $this;
	}

	/**
	 * @param \MailSo\Mime\EmailCollection $oEmails
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetBcc(\MailSo\Mime\EmailCollection $oEmails)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::BCC] = $oEmails;

		return $this;
	}

	/**
	 * @param \MailSo\Mime\EmailCollection $oEmails
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetSender(\MailSo\Mime\EmailCollection $oEmails)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::SENDER] = $oEmails;

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function SetDraftInfo(string $sType, string $sUid, string $sFolder)
	{
		$this->aHeadersValue[\MailSo\Mime\Enumerations\Header::X_DRAFT_INFO] = \MailSo\Mime\ParameterCollection::NewInstance()
			->Add(\MailSo\Mime\Parameter::NewInstance('type', $sType))
			->Add(\MailSo\Mime\Parameter::NewInstance('uid', $sUid))
			->Add(\MailSo\Mime\Parameter::NewInstance('folder', base64_encode($sFolder)))
		;

		return $this;
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function AddPlain(string $sPlain)
	{
		return $this->AddAlternative(
			\MailSo\Mime\Enumerations\MimeType::TEXT_PLAIN, trim($sPlain),
			\MailSo\Base\Enumerations\Encoding::QUOTED_PRINTABLE_LOWER);
	}
	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function AddHtml(string $sHtml)
	{
		return $this->AddAlternative(
			\MailSo\Mime\Enumerations\MimeType::TEXT_HTML, trim($sHtml),
			\MailSo\Base\Enumerations\Encoding::QUOTED_PRINTABLE_LOWER);
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function AddText(string $sHtmlOrPlainText, bool $bIsHtml = false)
	{
		return $bIsHtml ? $this->AddHtml($sHtmlOrPlainText) : $this->AddPlain($sHtmlOrPlainText);
	}

	/**
	 *
	 * @return \MailSo\Mime\Message
	 */
	public function AddAlternative(string $sContentType, $mData, string $sContentTransferEncoding = '', array $aCustomContentTypeParams = array())
	{
		$this->aAlternativeParts[] = array($sContentType, $mData, $sContentTransferEncoding, $aCustomContentTypeParams);

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
			\MailSo\Base\Utils::Md5Rand($sHostName.
				(\MailSo\Base\Utils::FunctionExistsAndEnabled('getmypid') ? @\getmypid() : '')).'@'.$sHostName.'>';
	}

	/**
	 * @param \MailSo\Mime\Attachment $oAttachment
	 *
	 * @return \MailSo\Mime\Part
	 */
	private function createNewMessageAttachmentBody($oAttachment)
	{
		$oAttachmentPart = Part::NewInstance();

		$sFileName = $oAttachment->FileName();
		$sCID = $oAttachment->CID();
		$sContentLocation = $oAttachment->ContentLocation();

		$oContentTypeParameters = null;
		$oContentDispositionParameters = null;

		if (0 < strlen(trim($sFileName)))
		{
			$oContentTypeParameters =
				ParameterCollection::NewInstance()->Add(Parameter::NewInstance(
					\MailSo\Mime\Enumerations\Parameter::NAME, $sFileName));

			$oContentDispositionParameters =
				ParameterCollection::NewInstance()->Add(Parameter::NewInstance(
					\MailSo\Mime\Enumerations\Parameter::FILENAME, $sFileName));
		}

		$oAttachmentPart->Headers->Add(
			Header::NewInstance(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
				$oAttachment->ContentType().';'.
				(($oContentTypeParameters) ? ' '.$oContentTypeParameters->ToString() : '')
			)
		);

		$oAttachmentPart->Headers->Add(
			Header::NewInstance(\MailSo\Mime\Enumerations\Header::CONTENT_DISPOSITION,
				($oAttachment->IsInline() ? 'inline' : 'attachment').';'.
				(($oContentDispositionParameters) ? ' '.$oContentDispositionParameters->ToString() : '')
			)
		);

		if (0 < strlen($sCID))
		{
			$oAttachmentPart->Headers->Add(
				Header::NewInstance(\MailSo\Mime\Enumerations\Header::CONTENT_ID, $sCID)
			);
		}

		if (0 < strlen($sContentLocation))
		{
			$oAttachmentPart->Headers->Add(
				Header::NewInstance(\MailSo\Mime\Enumerations\Header::CONTENT_LOCATION, $sContentLocation)
			);
		}

		$oAttachmentPart->Body = $oAttachment->Resource();

		if ('message/rfc822' !== strtolower($oAttachment->ContentType()))
		{
			$oAttachmentPart->Headers->Add(
				Header::NewInstance(
					\MailSo\Mime\Enumerations\Header::CONTENT_TRANSFER_ENCODING,
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

	/**
	 *
	 * @return \MailSo\Mime\Part
	 */
	private function createNewMessageAlternativePartBody(array $aAlternativeData)
	{
		$oAlternativePart = null;

		if (is_array($aAlternativeData) && isset($aAlternativeData[0]))
		{
			$oAlternativePart = Part::NewInstance();
			$oParameters = ParameterCollection::NewInstance();
			$oParameters->Add(
				Parameter::NewInstance(
					\MailSo\Mime\Enumerations\Parameter::CHARSET,
					\MailSo\Base\Enumerations\Charset::UTF_8)
			);

			if (isset($aAlternativeData[3]) && \is_array($aAlternativeData[3]) && 0 < \count($aAlternativeData[3]))
			{
				foreach ($aAlternativeData[3] as $sName => $sValue)
				{
					$oParameters->Add(Parameter::NewInstance($sName, $sValue));
				}
			}

			$oAlternativePart->Headers->Add(
				Header::NewInstance(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
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
				$oAlternativePart->Headers->Add(
					Header::NewInstance(\MailSo\Mime\Enumerations\Header::CONTENT_TRANSFER_ENCODING,
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

	/**
	 * @param \MailSo\Mime\Part $oPlainPart
	 * @param \MailSo\Mime\Part $oHtmlPart
	 *
	 * @return \MailSo\Mime\Part
	 */
	private function createNewMessageSimpleOrAlternativeBody()
	{
		$oResultPart = null;
		if (1 < count($this->aAlternativeParts))
		{
			$oResultPart = Part::NewInstance();

			$oResultPart->Headers->Add(
				Header::NewInstance(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
					\MailSo\Mime\Enumerations\MimeType::MULTIPART_ALTERNATIVE.'; '.
					ParameterCollection::NewInstance()->Add(
						Parameter::NewInstance(
							\MailSo\Mime\Enumerations\Parameter::BOUNDARY,
							$this->generateNewBoundary())
					)->ToString()
				)
			);

			foreach ($this->aAlternativeParts as $aAlternativeData)
			{
				$oAlternativePart = $this->createNewMessageAlternativePartBody($aAlternativeData);
				if ($oAlternativePart)
				{
					$oResultPart->SubParts->Add($oAlternativePart);
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
					\MailSo\Mime\Enumerations\MimeType::TEXT_PLAIN, null
				));
			}
			else
			{
				$aAttachments = $this->oAttachmentCollection->CloneAsArray();
				if (\is_array($aAttachments) && 1 === count($aAttachments) && isset($aAttachments[0]))
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

	/**
	 * @param \MailSo\Mime\Part $oIncPart
	 *
	 * @return \MailSo\Mime\Part
	 */
	private function createNewMessageRelatedBody($oIncPart)
	{
		$oResultPart = null;

		$aAttachments = $this->oAttachmentCollection->LinkedAttachments();
		if (0 < count($aAttachments))
		{
			$oResultPart = Part::NewInstance();

			$oResultPart->Headers->Add(
				Header::NewInstance(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
					\MailSo\Mime\Enumerations\MimeType::MULTIPART_RELATED.'; '.
					ParameterCollection::NewInstance()->Add(
						Parameter::NewInstance(
							\MailSo\Mime\Enumerations\Parameter::BOUNDARY,
							$this->generateNewBoundary())
					)->ToString()
				)
			);

			$oResultPart->SubParts->Add($oIncPart);

			foreach ($aAttachments as $oAttachment)
			{
				$oResultPart->SubParts->Add($this->createNewMessageAttachmentBody($oAttachment));
			}
		}
		else
		{
			$oResultPart = $oIncPart;
		}

		return $oResultPart;
	}

	/**
	 * @param \MailSo\Mime\Part $oIncPart
	 *
	 * @return \MailSo\Mime\Part
	 */
	private function createNewMessageMixedBody($oIncPart)
	{
		$oResultPart = null;

		$aAttachments = $this->oAttachmentCollection->UnlinkedAttachments();
		if (0 < count($aAttachments))
		{
			$oResultPart = Part::NewInstance();

			$oResultPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
				\MailSo\Mime\Enumerations\MimeType::MULTIPART_MIXED.'; '.
				ParameterCollection::NewInstance()->Add(
					Parameter::NewInstance(
						\MailSo\Mime\Enumerations\Parameter::BOUNDARY,
						$this->generateNewBoundary())
				)->ToString()
			);

			$oResultPart->SubParts->Add($oIncPart);

			foreach ($aAttachments as $oAttachment)
			{
				$oResultPart->SubParts->Add($this->createNewMessageAttachmentBody($oAttachment));
			}
		}
		else
		{
			$oResultPart = $oIncPart;
		}

		return $oResultPart;
	}

	/**
	 * @param \MailSo\Mime\Part $oIncPart
	 *
	 * @return \MailSo\Mime\Part
	 */
	private function setDefaultHeaders($oIncPart, bool $bWithoutBcc = false)
	{
		if (!isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::DATE]))
		{
			$oIncPart->Headers->SetByName(\MailSo\Mime\Enumerations\Header::DATE, \gmdate('r'), true);
		}

		if (!isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::MESSAGE_ID]))
		{
			$oIncPart->Headers->SetByName(\MailSo\Mime\Enumerations\Header::MESSAGE_ID, $this->generateNewMessageId(), true);
		}

		if (!isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::X_MAILER]) && $this->bAddDefaultXMailer)
		{
			$oIncPart->Headers->SetByName(\MailSo\Mime\Enumerations\Header::X_MAILER, \MailSo\Version::XMailer(), true);
		}

		if (!isset($this->aHeadersValue[\MailSo\Mime\Enumerations\Header::MIME_VERSION]))
		{
			$oIncPart->Headers->SetByName(\MailSo\Mime\Enumerations\Header::MIME_VERSION, '1.0', true);
		}

		foreach ($this->aHeadersValue as $sName => $mValue)
		{
			if (\is_object($mValue))
			{
				if ($mValue instanceof \MailSo\Mime\EmailCollection || $mValue instanceof \MailSo\Mime\Email ||
					$mValue instanceof \MailSo\Mime\ParameterCollection)
				{
					$mValue = $mValue->ToString();
				}
			}

			if (!($bWithoutBcc && \strtolower(\MailSo\Mime\Enumerations\Header::BCC) === \strtolower($sName)))
			{
				$oIncPart->Headers->SetByName($sName, (string) $mValue);
			}
		}

		return $oIncPart;
	}

	/**
	 *
	 * @return \MailSo\Mime\Part
	 */
	public function ToPart(bool $bWithoutBcc = false)
	{
		$oPart = $this->createNewMessageSimpleOrAlternativeBody();
		$oPart = $this->createNewMessageRelatedBody($oPart);
		$oPart = $this->createNewMessageMixedBody($oPart);
		$oPart = $this->setDefaultHeaders($oPart, $bWithoutBcc);

		return $oPart;
	}

	/**
	 *
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
