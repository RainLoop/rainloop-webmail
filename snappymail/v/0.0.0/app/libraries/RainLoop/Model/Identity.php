<?php

namespace RainLoop\Model;

use MailSo\Base\Utils;
use SnappyMail\SensitiveString;

class Identity implements \JsonSerializable
{
	private string $sId;

	private string $sLabel = '';

	private string $sEmail;

	private string $sName = '';

	private string $sReplyTo = '';

	private string $sBcc = '';

	private string $sSignature = '';

	private string $sSentFolder = '';

	private bool $bSignatureInsertBefore = false;

	private bool $pgpEncrypt = false;
	private bool $pgpSign = false;

	private ?SensitiveString $smimeKey = null;
	private string $smimeCertificate = '';

	function __construct(string $sId = '', string $sEmail = '')
	{
		$this->sId = $sId;
		$this->sEmail = $sEmail;
	}

	function toMime() : \MailSo\Mime\Email
	{
		return new \MailSo\Mime\Email($this->sEmail, $this->sName);
	}

	public function Id(bool $bFillOnEmpty = false): string
	{
		return $bFillOnEmpty ? ('' === $this->sId ? '---' : $this->sId) : $this->sId;
	}

	public function Email(): string
	{
		return $this->sEmail;
	}

	public function SetEmail(string $sEmail): self
	{
		$this->sEmail = $sEmail;

		return $this;
	}

	public function Name(): string
	{
		return $this->sName;
	}

	public function SetId(string $sId): Identity
	{
		$this->sId = $sId;
		return $this;
	}

	public function SetName(string $sName): Identity
	{
		$this->sName = $sName;
		return $this;
	}

	public function ReplyTo(): string
	{
		return $this->sReplyTo;
	}

	public function SetBcc(string $sBcc): Identity
	{
		$this->sBcc = $sBcc;
		return $this;
	}

	public function FromJSON(array $aData, bool $bJson = false): bool
	{
		if (!empty($aData['Email'])) {
			$this->sId = !empty($aData['Id']) ? $aData['Id'] : '';
			$this->sLabel = isset($aData['Label']) ? $aData['Label'] : '';
			$this->sEmail = $bJson ? Utils::IdnToAscii($aData['Email'], true) : $aData['Email'];
			$this->sName = isset($aData['Name']) ? $aData['Name'] : '';
			$this->sReplyTo = !empty($aData['ReplyTo']) ? $aData['ReplyTo'] : '';
			$this->sBcc = !empty($aData['Bcc']) ? $aData['Bcc'] : '';
			$this->sSignature = !empty($aData['Signature']) ? $aData['Signature'] : '';
			$this->bSignatureInsertBefore = !empty($aData['SignatureInsertBefore']);
			$this->sSentFolder = isset($aData['sentFolder']) ? $aData['sentFolder'] : '';
			$this->pgpEncrypt = !empty($aData['pgpEncrypt']);
			$this->pgpSign = !empty($aData['pgpSign']);
			$this->smimeKey = new SensitiveString(isset($aData['smimeKey']) ? $aData['smimeKey'] : '');
			$this->smimeCertificate = isset($aData['smimeCertificate']) ? $aData['smimeCertificate'] : '';
			return true;
		}

		return false;
	}

	// Used to store
	public function ToSimpleJSON(): array
	{
		return array(
			'Id' => $this->sId,
			'Label' => $this->sLabel,
			'Email' => $this->sEmail,
			'Name' => $this->sName,
			'ReplyTo' => $this->sReplyTo,
			'Bcc' => $this->sBcc,
			'Signature' => $this->sSignature,
			'SignatureInsertBefore' => $this->bSignatureInsertBefore,
			'sentFolder' => $this->sSentFolder,
			'pgpEncrypt' => $this->pgpEncrypt,
			'pgpSign' => $this->pgpSign,
			'smimeKey' => (string) $this->smimeKey,
			'smimeCertificate' => $this->smimeCertificate
		);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/Identity',
			'id' => $this->sId,
			'label' => $this->sLabel,
			'email' => Utils::IdnToUtf8($this->sEmail),
			'name' => $this->sName,
			'replyTo' => $this->sReplyTo,
			'bcc' => $this->sBcc,
			'signature' => $this->sSignature,
			'signatureInsertBefore' => $this->bSignatureInsertBefore,
			'sentFolder' => $this->sSentFolder,
			'pgpEncrypt' => $this->pgpEncrypt,
			'pgpSign' => $this->pgpSign,
			'smimeKey' => (string) $this->smimeKey,
			'smimeCertificate' => $this->smimeCertificate
		);
	}

	public function Validate(): bool
	{
		return !empty($this->sEmail);
	}

	public function IsAccountIdentities(): bool
	{
		return '' === $this->Id();
	}
}
