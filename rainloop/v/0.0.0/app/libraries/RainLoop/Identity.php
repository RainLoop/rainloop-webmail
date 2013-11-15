<?php

namespace RainLoop;

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
		$this->sEmail = \strtolower($sEmail);
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
	 * @return \RainLoop\Identity
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
	 * @return \RainLoop\Identity
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
	 * @return \RainLoop\Identity
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
	 * @param string $sName
	 *
	 * @return \RainLoop\Identity
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
	 * @return \RainLoop\Identity
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
	 * @return \RainLoop\Identity
	 */
	public function SetBcc($sBcc)
	{
		$this->sBcc = $sBcc;

		return $this;
	}

	/**
	 * @return array
	 */
	public function ToSimpleJSON()
	{
		return array(
			'Id' => $this->Id(),
			'Email' => $this->Email(),
			'Name' => $this->Name(),
			'ReplyTo' => $this->ReplyTo(),
			'Bcc' => $this->Bcc()
		);
	}
}
