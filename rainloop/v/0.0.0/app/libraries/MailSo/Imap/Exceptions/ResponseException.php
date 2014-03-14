<?php

namespace MailSo\Imap\Exceptions;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Exceptions
 */
class ResponseException extends \MailSo\Imap\Exceptions\Exception
{
	/**
	 * @var array
	 */
	private $aResponses;

	/**
	 * @param array $aResponses = array
	 * @param string $sMessage = ''
	 * @param int $iCode = 0
	 * @param \Exception $oPrevious = null
	 */
	public function __construct($aResponses = array(), $sMessage = '', $iCode = 0, $oPrevious = null)
	{
		parent::__construct($sMessage, $iCode, $oPrevious);

		if (is_array($aResponses))
		{
			$this->aResponses = $aResponses;
		}
	}

	/**
	 * @return array
	 */
	public function GetResponses()
	{
		return $this->aResponses;
	}

	/**
	 * @return \MailSo\Imap\Response|null
	 */
	public function GetLastResponse()
	{
		return 0 < count($this->aResponses) ? $this->aResponses[count($this->aResponses) - 1] : null;
	}
}
