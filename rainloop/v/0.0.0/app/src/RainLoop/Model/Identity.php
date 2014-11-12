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
	 * @param string $sId
	 * @param string $sEmail
	 * @param string $sName
	 * @param string $sReplyTo
	 * @param string $sBcc
	 *
	 * @return void
	 */
	protected function __construct($sId, $sEmail, $sName, $sReplyTo, $sBcc)
	{
		$this->sId = $sId;
		$this->sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		$this->sName = \trim($sName);
		$this->sReplyTo = \trim($sReplyTo);
		$this->sBcc = \trim($sBcc);
	}

	/**
	 * @param string $sId
	 * @param string $sEmail
	 * @param string $sName = ''
	 * @param string $sReplyTo = ''
	 * @param string $sBcc = ''
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public static function NewInstance($sId, $sEmail, $sName = '', $sReplyTo = '', $sBcc = '')
	{
		return new self($sId, $sEmail, $sName, $sReplyTo, $sBcc);
	}

	/**
	 * @return string
	 */
	public function Id()
	{
		return $this->sId;
	}

	/**
	 * @param string $sId
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public function SetId($sId)
	{
		$this->sId = $sId;

		return $this;
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
		$this->sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);

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
	 * @param string $sName
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public function SetName($sName)
	{
		$this->sName = $sName;

		return $this;
	}

	/**
	 * @return string
	 */
	public function ReplyTo()
	{
		return $this->sReplyTo;
	}

	/**
	 * @param string $sReplyTo
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public function SetReplyTo($sReplyTo)
	{
		$this->sReplyTo = $sReplyTo;

		return $this;
	}

	/**
	 * @return string
	 */
	public function Bcc()
	{
		return $this->sBcc;
	}

	/**
	 * @param string $sBcc
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public function SetBcc($sBcc)
	{
		$this->sBcc = $sBcc;

		return $this;
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
}
