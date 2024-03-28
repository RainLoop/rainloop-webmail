<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Requests;

/**
 * @category MailSo
 * @package Imap
 */
class ESEARCH extends Request
{
	public string $sCriterias = 'ALL';

	public array $aReturn = [
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

	public bool $bUid = true;

	public string $sLimit = '';

	public string $sCharset = '';

	// https://datatracker.ietf.org/doc/html/rfc7377
	public array $aMailboxes = [];
	public array $aSubtrees = [];
	public array $aSubtreesOne = [];

	function __construct(\MailSo\Imap\ImapClient $oImapClient)
	{
		if (!$oImapClient->hasCapability('ESEARCH')) {
			$oImapClient->writeLogException(new \MailSo\RuntimeException('ESEARCH is not supported'), \LOG_ERR);
		}
		parent::__construct($oImapClient);
	}

	public function SendRequest() : string
	{
		$sCmd = 'SEARCH';
		$aRequest = array();

/*		// RFC 6203
		if (false !== \stripos($this->sCriterias, 'FUZZY') && !$this->oImapClient->hasCapability('SEARCH=FUZZY')) {
			$this->oImapClient->writeLogException(new \MailSo\RuntimeException('SEARCH=FUZZY is not supported'), \LOG_ERR);
		}
*/

		$aFolders = [];
		if ($this->aMailboxes) {
			$aFolders[] = 'mailboxes';
			$aFolders[] = $this->aMailboxes;
		}
		if ($this->aSubtrees) {
			$aFolders[] = 'subtree';
			$aFolders[] = $this->aSubtrees;
		}
		if ($this->aSubtreesOne) {
			$aFolders[] = 'subtree-one';
			$aFolders[] = $this->aSubtreesOne;
		}
		if ($aFolders) {
			if (!$this->oImapClient->hasCapability('MULTISEARCH')) {
				$this->oImapClient->writeLogException(new \MailSo\RuntimeException('MULTISEARCH is not supported'), \LOG_ERR);
			}
			$sCmd = 'ESEARCH';
			$aReques[] = 'IN';
			$aReques[] = $aFolders;
		}

		if (\strlen($this->sCharset)) {
			$aRequest[] = 'CHARSET';
			$aRequest[] = \strtoupper($this->sCharset);
		}

		$aRequest[] = 'RETURN';
		if ($this->aReturn) {
			// RFC 5267 checks
			if (!$this->oImapClient->hasCapability('CONTEXT=SEARCH')) {
				foreach ($this->aReturn as $sReturn) {
					if (\preg_match('/PARTIAL|UPDATE|CONTEXT/i', $sReturn)) {
						$this->oImapClient->writeLogException(new \MailSo\RuntimeException('CONTEXT=SEARCH is not supported'), \LOG_ERR);
					}
				}
			}
			$aRequest[] = $this->aReturn;
		} else {
			$aRequest[] = array('ALL');
		}

		$aRequest[] = (\strlen($this->sCriterias) && '*' !== $this->sCriterias) ? $this->sCriterias : 'ALL';

		if (\strlen($this->sLimit)) {
			$aRequest[] = $this->sLimit;
		}

		return $this->oImapClient->SendRequest(
			($this->bUid ? 'UID ' : '') . $sCmd,
			$aRequest
		);
	}
}
