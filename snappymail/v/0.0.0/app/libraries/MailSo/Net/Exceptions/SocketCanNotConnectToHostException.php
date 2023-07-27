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
class SocketCanNotConnectToHostException extends ConnectionException
{
	private string $sSocketMessage;

	private int $iSocketCode;

	public function __construct(string $sSocketMessage = '', int $iSocketCode = 0, string $sMessage = '', int $iCode = 0, ?\Throwable $oPrevious = null)
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
