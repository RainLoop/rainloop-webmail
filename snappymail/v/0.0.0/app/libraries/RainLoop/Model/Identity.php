<?php

namespace RainLoop\Model;

use MailSo\Base\Utils;

class Identity implements \JsonSerializable
{
	/**
	 * @var string
	 */
	private $sId;

	/**
	 * @var string
	 */
	private $sEmail;

	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var string
	 */
	private $sReplyTo;

	/**
	 * @var string
	 */
	private $sBcc;

	/**
	 * @var string
	 */
	private $sSignature;

	/**
	 * @var bool
	 */
	private $bSignatureInsertBefore;

	function __construct(string $sId = '', string $sEmail = '')
	{
		$this->sId = $sId;
		$this->sEmail = $sEmail;
		$this->sName = '';
		$this->sReplyTo = '';
		$this->sBcc = '';
		$this->sSignature = '';
		$this->bSignatureInsertBefore = false;
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

	public function Signature(): string
	{
		return $this->sSignature;
	}

	public function SignatureInsertBefore(): bool
	{
		return $this->bSignatureInsertBefore;
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
				($bJson ? '1' === $aData['SignatureInsertBefore'] : !!$aData['SignatureInsertBefore']) : true;

			return true;
		}

		return false;
	}

	public function ToSimpleJSON(): array
	{
		return array(
			'Id' => $this->Id(),
			'Email' => $this->Email(),
			'Name' => $this->Name(),
			'ReplyTo' => $this->ReplyTo(),
			'Bcc' => $this->Bcc(),
			'Signature' => $this->Signature(),
			'SignatureInsertBefore' => $this->SignatureInsertBefore()
		);
	}

	public function jsonSerialize()
	{
		return array(
			'Id' => $this->Id(),
			'Email' => Utils::IdnToUtf8($this->Email()),
			'Name' => $this->Name(),
			'ReplyTo' => $this->ReplyTo(),
			'Bcc' => $this->Bcc(),
			'Signature' => $this->Signature(),
			'SignatureInsertBefore' => $this->SignatureInsertBefore()
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
