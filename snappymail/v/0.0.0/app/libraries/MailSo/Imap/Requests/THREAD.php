<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * https://datatracker.ietf.org/doc/html/rfc5256
 */

namespace MailSo\Imap\Requests;

/**
 * @category MailSo
 * @package Imap
 */
class THREAD extends Request
{
	public
		$sAlgorithm = '', // ORDEREDSUBJECT or REFERENCES or REFS
		$sCriterias = 'ALL',
		$sCharset = '',
		$bUid = true;

	function __construct(\MailSo\Imap\ImapClient $oImapClient)
	{
		if ($oImapClient->IsSupported('THREAD=REFS')) {
			$this->sAlgorithm = 'REFS';
		} else if ($oImapClient->IsSupported('THREAD=REFERENCES')) {
			$this->sAlgorithm = 'REFERENCES';
		} else if ($oImapClient->IsSupported('THREAD=ORDEREDSUBJECT')) {
			$this->sAlgorithm = 'ORDEREDSUBJECT';
		} else {
			$oImapClient->writeLogException(
				new RuntimeException('THREAD is not supported'),
				Type::ERROR, true);
		}
		parent::__construct($oImapClient);
	}

	public function SendRequestGetResponse() : \MailSo\Imap\ResponseCollection
	{
		if (!$this->oImapClient->IsSupported(\strtoupper("THREAD={$this->sAlgorithm}"))) {
			$this->oImapClient->writeLogException(
				new Exceptions\RuntimeException("THREAD={$this->sAlgorithm} is not supported"),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$aRequest = array();
		$aRequest[] = $this->sAlgorithm;

		$sSearchCriterias = (\strlen($this->sCriterias) && '*' !== $this->sCriterias) ? $this->sCriterias : 'ALL';

		if (!$this->sCharset) {
			$this->sCharset = \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? 'US-ASCII' : 'UTF-8';
		}

		$aRequest[] = \strtoupper($this->sCharset);
		$aRequest[] = $sSearchCriterias;

		return $this->oImapClient->SendRequestGetResponse(
			($this->bUid ? 'UID THREAD' : 'THREAD'),
			$aRequest
		);
	}
}
