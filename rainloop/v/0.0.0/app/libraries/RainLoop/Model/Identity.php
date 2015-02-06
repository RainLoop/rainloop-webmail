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
	 * @param string $sId = ''
	 * @param string $sEmail = ''
	 *
	 * @return void
	 */
	protected function __construct($sId = '', $sEmail = '')
	{
		$this->sId = $sId;
		$this->sEmail = $sEmail;
		$this->sName = '';
		$this->sReplyTo = '';
		$this->sBcc = '';
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
	 * @return string
	 */
	public function Id()
	{
		return $this->sId;
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
	 * @param array $aData
	 * @param bool $bAjax = false
	 *
	 * @return bool
	 */
	public function FromJSON($aData, $bAjax = false)
	{
		if (isset($aData['Id'], $aData['Email']) && !empty($aData['Email']))
		{
			$this->sId = $aData['Id'];
			$this->sEmail = $bAjax ? \MailSo\Base\Utils::IdnToAscii($aData['Email'], true) : $aData['Email'];
			$this->sName = isset($aData['Name']) ? $aData['Name'] : '';
			$this->sReplyTo = !empty($aData['ReplyTo']) ? $aData['ReplyTo'] : '';
			$this->sBcc = !empty($aData['Bcc']) ? $aData['Bcc'] : '';

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
			'Bcc' => $this->Bcc()
		);
	}

	/**
	 * @return bool
	 */
	public function Validate()
	{
		return !empty($this->sEmail);
	}
}
