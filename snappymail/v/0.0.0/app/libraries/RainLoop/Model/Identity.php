<?php

namespace RainLoop\Model;

use MailSo\Base\Utils;

class Identity implements \JsonSerializable
{
	private string $sId;

	private string $sEmail;

	private string $sName = '';

	private string $sReplyTo = '';

	private string $sBcc = '';

	private string $sSignature = '';

	private bool $bSignatureInsertBefore = false;

	function __construct(string $sId = '', string $sEmail = '')
	{
		$this->sId = $sId;
		$this->sEmail = $sEmail;
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

	public function ReplyTo(): string
	{
		return $this->sReplyTo;
	}

	public function Bcc(): string
	{
		return $this->sBcc;
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

	public function SetReplyTo(string $sReplyTo): Identity
	{
		$this->sReplyTo = $sReplyTo;
		return $this;
	}

	public function SetBcc(string $sBcc): Identity
	{
		$this->sBcc = $sBcc;
		return $this;
	}

	public function SetSignature(string $sSignature): Identity
	{
		$this->sSignature = $sSignature;
		return $this;
	}

	public function SetSignatureInsertBefore(bool $bSignatureInsertBefore): Identity
	{
		$this->bSignatureInsertBefore = $bSignatureInsertBefore;
		return $this;
	}

	public function FromJSON(array $aData, bool $bJson = false): bool
	{
		if (!empty($aData['Email'])) {
			$this->sId = !empty($aData['Id']) ? $aData['Id'] : '';
			$this->sEmail = $bJson ? Utils::IdnToAscii($aData['Email'], true) : $aData['Email'];
			$this->sName = isset($aData['Name']) ? $aData['Name'] : '';
			$this->sReplyTo = !empty($aData['ReplyTo']) ? $aData['ReplyTo'] : '';
			$this->sBcc = !empty($aData['Bcc']) ? $aData['Bcc'] : '';
			$this->sSignature = !empty($aData['Signature']) ? $aData['Signature'] : '';
			$this->bSignatureInsertBefore = isset($aData['SignatureInsertBefore']) ?
				!empty($aData['SignatureInsertBefore']) : true;

			return true;
		}

		return false;
	}

	public function ToSimpleJSON(): array
	{
		return array(
			'Id' => $this->sId,
			'Email' => $this->sEmail,
			'Name' => $this->sName,
			'ReplyTo' => $this->sReplyTo,
			'Bcc' => $this->sBcc,
			'Signature' => $this->sSignature,
			'SignatureInsertBefore' => $this->bSignatureInsertBefore
		);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'Id' => $this->sId,
			'Email' => Utils::IdnToUtf8($this->sEmail),
			'Name' => $this->sName,
			'ReplyTo' => $this->sReplyTo,
			'Bcc' => $this->sBcc,
			'Signature' => $this->sSignature,
			'SignatureInsertBefore' => $this->bSignatureInsertBefore
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
