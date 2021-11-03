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
	public
		$sCriterias = 'ALL',
		$aReturn = [],
		$bUid = true,
		$sLimit = '',
		$sCharset = '',
		$aMailboxes = [],
		$aSubtrees = [],
		$aSubtreesOne = [];

	public function SendRequestGetResponse() : \MailSo\Imap\ResponseCollection
	{
		if (!$this->oImapClient->IsSupported('ESEARCH')) {
			$this->oImapClient->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sCmd = 'SEARCH';
		$aRequest = array();

		// TODO: https://github.com/the-djmaze/snappymail/issues/154
		// https://datatracker.ietf.org/doc/html/rfc7377
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
		if ($aFolders && $this->oImapClient->IsSupported('MULTISEARCH')) {
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
			$aRequest[] = $this->aReturn;
		} else {
			// ALL OR COUNT | MIN | MAX
			$aRequest[] = array('ALL');
		}

		$aRequest[] = !\strlen($this->sCriterias) || '*' === $this->sCriterias
			? 'ALL' : $this->sCriterias;

		if (\strlen($this->sLimit)) {
			$aRequest[] = $this->sLimit;
		}

		return $this->oImapClient->SendRequestGetResponse(
			($this->bUid ? 'UID ' : '') . $sCmd,
			$aRequest
		);
	}
}
