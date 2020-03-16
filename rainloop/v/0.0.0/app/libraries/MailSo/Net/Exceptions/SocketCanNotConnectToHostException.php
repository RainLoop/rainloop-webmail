<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Net\Exceptions;

/**
 * @category MailSo
 * @package Net
 * @subpackage Exceptions
 */
class SocketCanNotConnectToHostException extends \MailSo\Net\Exceptions\ConnectionException
{
	/**
	 * @var string
	 */
	private $sSocketMessage;

	/**
	 * @var int
	 */
	private $iSocketCode;

	/**
	 * @param \Exception $oPrevious = null
	 */
	public function __construct($sSocketMessage = '', $iSocketCode = 0, $sMessage = '', $iCode = 0, $oPrevious = null)
	{
		parent::__construct($sMessage, $iCode, $oPrevious);

		$this->sSocketMessage = $sSocketMessage;
		$this->iSocketCode = $iSocketCode;
	}

	public function getSocketMessage() : string
	{
		return $this->sSocketMessage;
	}

	public function getSocketCode() : int
	{
		return $this->iSocketCode;
	}
}
