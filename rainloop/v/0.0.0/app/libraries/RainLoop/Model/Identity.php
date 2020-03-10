<?php

namespace RainLoop\Model;

class Identity
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

	protected function __construct(string $sId = '', string $sEmail = '')
	{
		$this->sId = empty($sId) ? '' : $sId;
		$this->sEmail = empty($sEmail) ? '' : $sEmail;
		$this->sName = '';
		$this->sReplyTo = '';
		$this->sBcc = '';
		$this->sSignature = '';
		$this->bSignatureInsertBefore = false;
	}

	public static function NewInstance() : self
	{
		return new self();
	}

	public static function NewInstanceFromAccount(\RainLoop\Model\Account $oAccount) : self
	{
		return new self('', $oAccount->Email());
	}

	public function Id(bool $bFillOnEmpty = false) : string
	{
		return $bFillOnEmpty ? ('' === $this->sId ? '---' : $this->sId) : $this->sId;
	}

	public function Email() : string
	{
		return $this->sEmail;
	}

	public function SetEmail(string $sEmail) : self
	{
		$this->sEmail = $sEmail;

		return $this;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function ReplyTo() : string
	{
		return $this->sReplyTo;
	}

	public function Bcc() : string
	{
		return $this->sBcc;
	}

	public function Signature() : string
	{
		return $this->sSignature;
	}

	public function SignatureInsertBefore() : bool
	{
		return $this->bSignatureInsertBefore;
	}

	public function FromJSON(array $aData, bool $bAjax = false) : bool
	{
		if (!empty($aData['Email']))
		{
			$this->sId = !empty($aData['Id']) ? $aData['Id'] : '';
			$this->sEmail = $bAjax ? \MailSo\Base\Utils::IdnToAscii($aData['Email'], true) : $aData['Email'];
			$this->sName = isset($aData['Name']) ? $aData['Name'] : '';
			$this->sReplyTo = !empty($aData['ReplyTo']) ? $aData['ReplyTo'] : '';
			$this->sBcc = !empty($aData['Bcc']) ? $aData['Bcc'] : '';
			$this->sSignature = !empty($aData['Signature']) ? $aData['Signature'] : '';
			$this->bSignatureInsertBefore = isset($aData['SignatureInsertBefore']) ?
				($bAjax ? '1' === $aData['SignatureInsertBefore'] : !!$aData['SignatureInsertBefore']) : true;

			return true;
		}

		return false;
	}

	public function ToSimpleJSON(bool $bAjax = false) : array
	{
		return array(
			'Id' => $this->Id(),
			'Email' => $bAjax ? \MailSo\Base\Utils::IdnToUtf8($this->Email()) : $this->Email(),
			'Name' => $this->Name(),
			'ReplyTo' => $this->ReplyTo(),
			'Bcc' => $this->Bcc(),
			'Signature' => $this->Signature(),
			'SignatureInsertBefore' => $this->SignatureInsertBefore()
		);
	}

	public function Validate() : bool
	{
		return !empty($this->sEmail);
	}

	public function IsAccountIdentities() : bool
	{
		return '' === $this->Id();
	}
}
