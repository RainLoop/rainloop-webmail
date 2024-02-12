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
class Message extends Part
{
	private array $aHeadersValue = array(
/*
		Enumerations\Header::BCC => '',
		Enumerations\Header::CC => '',
		Enumerations\Header::DATE => '',
		Enumerations\Header::DISPOSITION_NOTIFICATION_TO => '',
		Enumerations\Header::FROM_ => '',
		Enumerations\Header::IN_REPLY_TO => '',
		Enumerations\Header::MESSAGE_ID => '',
		Enumerations\Header::MIME_VERSION => '',
		Enumerations\Header::REFERENCES => '',
		Enumerations\Header::REPLY_TO => '',
		Enumerations\Header::SENDER => '',
		Enumerations\Header::SUBJECT => '',
		Enumerations\Header::TO_ => '',
		Enumerations\Header::X_CONFIRM_READING_TO => '',
		Enumerations\Header::X_DRAFT_INFO => '',
		Enumerations\Header::X_MAILER => '',
		Enumerations\Header::X_PRIORITY => '',
*/
	);

	private AttachmentCollection $oAttachmentCollection;

	private bool $bAddEmptyTextPart = true;

	private bool $bAddDefaultXMailer = true;

	function __construct()
	{
		parent::__construct();
		$this->oAttachmentCollection = new AttachmentCollection;
	}

	private function getHeaderValue(string $name)
	{
		return isset($this->aHeadersValue[$name])
			? $this->aHeadersValue[$name]
			: null;
	}

	public function DoesNotAddDefaultXMailer() : void
	{
		$this->bAddDefaultXMailer = false;
	}

	public function MessageId() : string
	{
		return $this->getHeaderValue(Enumerations\Header::MESSAGE_ID) ?: '';
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
		return $this->getHeaderValue(Enumerations\Header::SUBJECT) ?: '';
	}

	public function GetFrom() : ?Email
	{
		$value = $this->getHeaderValue(Enumerations\Header::FROM_);
		return ($value instanceof Email) ? $value : null;
	}

	public function GetTo() : ?EmailCollection
	{
		$value = $this->getHeaderValue(Enumerations\Header::TO_);
		return ($value instanceof EmailCollection) ? $value->Unique() : null;
	}

	public function GetCc() : ?EmailCollection
	{
		$value = $this->getHeaderValue(Enumerations\Header::CC);
		return ($value instanceof EmailCollection) ? $value->Unique() : null;
	}

	public function GetBcc() : ?EmailCollection
	{
		$value = $this->getHeaderValue(Enumerations\Header::BCC);
		return ($value instanceof EmailCollection) ? $value->Unique() : null;
	}

	public function GetRcpt() : EmailCollection
	{
		$oResult = new EmailCollection;

		$headers = array(Enumerations\Header::TO_, Enumerations\Header::CC, Enumerations\Header::BCC);
		foreach ($headers as $header) {
			$value = $this->getHeaderValue($header);
			if ($value instanceof EmailCollection) {
				foreach ($value as $oEmail) {
					$oResult->append($oEmail);
				}
			}
		}

/*
		$aReturn = array();
		$headers = array(Enumerations\Header::TO_, Enumerations\Header::CC, Enumerations\Header::BCC);
		foreach ($headers as $header) {
			$value = $this->getHeaderValue($header);
			if ($value instanceof EmailCollection) {
				foreach ($value as $oEmail) {
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
		if (\strlen($sHeaderName)) {
			$this->aHeadersValue[$sHeaderName] = $sValue;
		}

		return $this;
	}

	public function SetAutocrypt(array $aValue) : self
	{
		$this->aHeadersValue['Autocrypt'] = $aValue;
		return $this;
	}

	public function SetSubject(string $sSubject) : self
	{
		$this->aHeadersValue[Enumerations\Header::SUBJECT] = $sSubject;

		return $this;
	}

	public function SetInReplyTo(string $sInReplyTo) : self
	{
		$sInReplyTo = \trim($sInReplyTo);
		if (\strlen($sInReplyTo)) {
			$this->aHeadersValue[Enumerations\Header::IN_REPLY_TO] = $sInReplyTo;
		}
		return $this;
	}

	public function SetReferences(string $sReferences) : self
	{
		$sReferences = \MailSo\Base\Utils::StripSpaces($sReferences);
		if (\strlen($sReferences)) {
			$this->aHeadersValue[Enumerations\Header::REFERENCES] = $sReferences;
		}
		return $this;
	}

	public function SetReadReceipt(string $sEmail) : self
	{
		$this->aHeadersValue[Enumerations\Header::DISPOSITION_NOTIFICATION_TO] = $sEmail;
		$this->aHeadersValue[Enumerations\Header::X_CONFIRM_READING_TO] = $sEmail;

		return $this;
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

		if (\strlen($sResult)) {
			$this->aHeadersValue[Enumerations\Header::X_PRIORITY] = $sResult;
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
		if ($oEmails->count()) {
			$this->aHeadersValue[Enumerations\Header::TO_] = $oEmails;
		}
		return $this;
	}

	public function SetDate(int $iDateTime) : self
	{
		$this->aHeadersValue[Enumerations\Header::DATE] = \gmdate('r', $iDateTime);

		return $this;
	}

	public function SetReplyTo(EmailCollection $oEmails) : self
	{
		if ($oEmails->count()) {
			$this->aHeadersValue[Enumerations\Header::REPLY_TO] = $oEmails;
		}
		return $this;
	}

	public function SetCc(EmailCollection $oEmails) : self
	{
		if ($oEmails->count()) {
			$this->aHeadersValue[Enumerations\Header::CC] = $oEmails;
		}
		return $this;
	}

	public function SetBcc(EmailCollection $oEmails) : self
	{
		if ($oEmails->count()) {
			$this->aHeadersValue[Enumerations\Header::BCC] = $oEmails;
		}
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

	private function generateNewMessageId(string $sHostName = '') : string
	{
		if (!\strlen($sHostName)) {
			$sHostName = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '';
		}

		if (empty($sHostName) && \MailSo\Base\Utils::FunctionCallable('php_uname')) {
			$sHostName = \php_uname('n');
		}

		if (empty($sHostName)) {
			$sHostName = 'localhost';
		}

		return '<'.
			\MailSo\Base\Utils::Sha1Rand($sHostName.
				(\MailSo\Base\Utils::FunctionCallable('getmypid') ? \getmypid() : '')).'@'.$sHostName.'>';
	}

	public function GetRootPart() : Part
	{
		if (!\count($this->SubParts)) {
			if ($this->bAddEmptyTextPart) {
				$oPart = new Part;
				$oPart->Headers->AddByName(Enumerations\Header::CONTENT_TYPE, 'text/plain; charset="utf-8"');
				$oPart->Body = '';
				$this->SubParts->append($oPart);
			} else {
				$aAttachments = $this->oAttachmentCollection->getArrayCopy();
				if (1 === \count($aAttachments) && isset($aAttachments[0])) {
					$this->oAttachmentCollection->Clear();

					$oPart = new Part;
					$oParameters = new ParameterCollection;
					$oParameters->append(
						new Parameter(
							Enumerations\Parameter::CHARSET,
							\MailSo\Base\Enumerations\Charset::UTF_8)
					);
					$params = $aAttachments[0]->CustomContentTypeParams();
					if ($params && \is_array($params)) {
						foreach ($params as $sName => $sValue) {
							$oParameters->append(new Parameter($sName, $sValue));
						}
					}
					$oPart->Headers->append(
						new Header(Enumerations\Header::CONTENT_TYPE,
							$aAttachments[0]->ContentType().'; '.$oParameters)
					);

					if ($resource = $aAttachments[0]->Resource()) {
						if (\is_resource($resource)) {
							$oPart->Body = $resource;
						} else if (\is_string($resource) && \strlen($resource)) {
							$oPart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($resource);
						}
					}
					if (!\is_resource($oPart->Body)) {
						$oPart->Body = '';
					}

					$this->SubParts->append($oPart);
				}
			}
		}

		$oRootPart = $oRelatedPart = null;
		if (1 == \count($this->SubParts)) {
			$oRootPart = $this->SubParts[0];
			foreach ($this->oAttachmentCollection as $oAttachment) {
				if ($oAttachment->isLinked()) {
					$oRelatedPart = new Part;
					$oRelatedPart->Headers->append(
						new Header(Enumerations\Header::CONTENT_TYPE, 'multipart/related')
					);
					$oRelatedPart->SubParts->append($oRootPart);
					$oRootPart = $oRelatedPart;
					break;
				}
			}
		} else {
			$oRootPart = new Part;
			$oRootPart->Headers->AddByName(Enumerations\Header::CONTENT_TYPE, 'multipart/mixed');
			$oRootPart->SubParts = $this->SubParts;
		}

		$oMixedPart = null;
		foreach ($this->oAttachmentCollection as $oAttachment) {
			if ($oRelatedPart && $oAttachment->isLinked()) {
				$oRelatedPart->SubParts->append($oAttachment->ToPart());
			} else {
				if (!$oMixedPart) {
					$oMixedPart = new Part;
					$oMixedPart->Headers->AddByName(Enumerations\Header::CONTENT_TYPE, 'multipart/mixed');
					$oMixedPart->SubParts->append($oRootPart);
					$oRootPart = $oMixedPart;
				}
				$oMixedPart->SubParts->append($oAttachment->ToPart());
			}
		}

		return $oRootPart;
	}

	/**
	 * @return resource|bool
	 */
	public function ToStream(bool $bWithoutBcc = false)
	{
		$oRootPart = $this->GetRootPart();

		/**
		 * setDefaultHeaders
		 */
		if (!isset($this->aHeadersValue[Enumerations\Header::DATE])) {
			$oRootPart->Headers->SetByName(Enumerations\Header::DATE, \gmdate('r'), true);
		}

		if (!isset($this->aHeadersValue[Enumerations\Header::MESSAGE_ID])) {
			$oRootPart->Headers->SetByName(Enumerations\Header::MESSAGE_ID, $this->generateNewMessageId(), true);
		}

		if ($this->bAddDefaultXMailer && !isset($this->aHeadersValue[Enumerations\Header::X_MAILER])) {
			$oRootPart->Headers->SetByName(Enumerations\Header::X_MAILER, 'SnappyMail/'.APP_VERSION, true);
		}

		if (!isset($this->aHeadersValue[Enumerations\Header::MIME_VERSION])) {
			$oRootPart->Headers->SetByName(Enumerations\Header::MIME_VERSION, '1.0', true);
		}

		foreach ($this->aHeadersValue as $sName => $mValue) {
			if ('autocrypt' === \strtolower($sName)) {
				foreach ($mValue as $key) {
					$oRootPart->Headers->AddByName($sName, $key);
				}
			} else if (!($bWithoutBcc && \strtolower(Enumerations\Header::BCC) === \strtolower($sName))) {
				$oRootPart->Headers->SetByName($sName, (string) $mValue);
			}
		}

		$resource = $oRootPart->ToStream();
		\MailSo\Base\StreamFilters\LineEndings::appendTo($resource);
		return $resource;
	}
/*
	public function ToString(bool $bWithoutBcc = false) : string
	{
		return \stream_get_contents($this->ToStream($bWithoutBcc));
	}
*/
}
