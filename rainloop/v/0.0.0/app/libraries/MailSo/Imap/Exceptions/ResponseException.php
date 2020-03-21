<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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
	private $oResponses;

	public function __construct(?ResponseCollection $oResponses = null, string $sMessage = '', int $iCode = 0, ?\Throwable $oPrevious = null)
	{
		parent::__construct($sMessage, $iCode, $oPrevious);

		$this->oResponses = $oResponses;
	}

	public function GetResponses() : ?ResponseCollection
	{
		return $this->oResponses;
	}

	public function GetLastResponse() : ?Response
	{
		if ($this->oResponses && \count($this->oResponses)) {
			return $this->oResponses[count($this->oResponses) - 1];
		}
		return null;
	}
}
