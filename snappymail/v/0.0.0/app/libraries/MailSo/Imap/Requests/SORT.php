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
 * https://datatracker.ietf.org/doc/html/rfc5957
 */

namespace MailSo\Imap\Requests;

/**
 * @category MailSo
 * @package Imap
 */
class SORT extends Request
{
	public
		$sCriterias = 'ALL',
		$sCharset = '',
		$bUid = true,
		$aSortTypes = [],
		$sLimit = '',
		// RFC 5267
		$aReturn = [
		/**
		   ALL
			  Return all message numbers/UIDs which match the search criteria,
			  in the requested sort order, using a sequence-set.

		   COUNT
			  As in [ESEARCH].

		   MAX
			  Return the message number/UID of the highest sorted message
			  satisfying the search criteria.

		   MIN
			  Return the message number/UID of the lowest sorted message
			  satisfying the search criteria.

		   PARTIAL 1:500
			  Return all message numbers/UIDs which match the search criteria,
			  in the requested sort order, using a sequence-set.
		 */
		];

	function __construct(\MailSo\Imap\ImapClient $oImapClient)
	{
		if (!$oImapClient->hasCapability('SORT')) {
			$oImapClient->writeLogException(new \MailSo\RuntimeException('SORT is not supported'), \LOG_ERR);
		}
		parent::__construct($oImapClient);
	}

	public function SendRequest() : string
	{
		if (!$this->aSortTypes) {
			$this->oImapClient->writeLogException(new \MailSo\RuntimeException('SortTypes are missing'), \LOG_ERR);
		}

		$aRequest = array();

		if ($this->aReturn) {
			// RFC 5267 checks
			if (!$this->oImapClient->hasCapability('ESORT')) {
				$this->oImapClient->writeLogException(new \MailSo\RuntimeException('ESORT is not supported'), \LOG_ERR);
			}
			if (!$this->oImapClient->hasCapability('CONTEXT=SORT')) {
				foreach ($this->aReturn as $sReturn) {
					if (\preg_match('/PARTIAL|UPDATE|CONTEXT/i', $sReturn)) {
						$this->oImapClient->writeLogException(new \MailSo\RuntimeException('CONTEXT=SORT is not supported'), \LOG_ERR);
					}
				}
			}
			$aRequest[] = 'RETURN';
			$aRequest[] = $this->aReturn;
		}

		$aRequest[] = $this->aSortTypes;

		$aRequest[] = 'UTF-8'; // \strtoupper(\MailSo\Base\Enumerations\Charset::UTF_8)

		$aRequest[] = (\strlen($this->sCriterias) && '*' !== $this->sCriterias) ? $this->sCriterias : 'ALL';

		if (\strlen($this->sLimit)) {
			$aRequest[] = $this->sLimit;
		}

		return $this->oImapClient->SendRequest(
			($this->bUid ? 'UID SORT' : 'SORT'),
			$aRequest
		);
	}
}
