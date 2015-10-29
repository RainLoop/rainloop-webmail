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

	/**
	 * @param string $sId = ''
	 * @param string $sEmail = ''
	 *
	 * @return void
	 */
	protected function __construct($sId = '', $sEmail = '')
	{
		$this->sId = empty($sId) ? '' : $sId;
		$this->sEmail = empty($sEmail) ? '' : $sEmail;
		$this->sName = '';
		$this->sReplyTo = '';
		$this->sBcc = '';
		$this->sSignature = '';
		$this->bSignatureInsertBefore = false;
	}

	/**
	 * @return \RainLoop\Model\Identity
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public static function NewInstanceFromAccount(\RainLoop\Model\Account $oAccount)
	{
		return new self('', $oAccount->Email());
	}

	/**
	 * @param bool $bFillOnEmpty = false
	 *
	 * @return string
	 */
	public function Id($bFillOnEmpty = false)
	{
		return $bFillOnEmpty ? ('' === $this->sId ? '---' : $this->sId) : $this->sId;
	}

	/**
	 * @return string
	 */
	public function Email()
	{
		return $this->sEmail;
	}

	/**
	 * @param string $sEmail
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public function SetEmail($sEmail)
	{
		$this->sEmail = $sEmail;

		return $this;
	}

	/**
	 * @return string
	 */
	public function Name()
	{
		return $this->sName;
	}

	/**
	 * @return string
	 */
	public function ReplyTo()
	{
		return $this->sReplyTo;
	}

	/**
	 * @return string
	 */
	public function Bcc()
	{
		return $this->sBcc;
	}

	/**
	 * @return string
	 */
	public function Signature()
	{
		return $this->sSignature;
	}

	/**
	 * @return bool
	 */
	public function SignatureInsertBefore()
	{
		return $this->bSignatureInsertBefore;
	}

	/**
	 * @param array $aData
	 * @param bool $bAjax = false
	 *
	 * @return bool
	 */
	public function FromJSON($aData, $bAjax = false)
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

	/**
	 * @param bool $bAjax = false
	 *
	 * @return array
	 */
	public function ToSimpleJSON($bAjax = false)
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

	/**
	 * @return bool
	 */
	public function Validate()
	{
		return !empty($this->sEmail);
	}

	/**
	 * @return bool
	 */
	public function IsAccountIdentities()
	{
		return '' === $this->Id();
	}
}
