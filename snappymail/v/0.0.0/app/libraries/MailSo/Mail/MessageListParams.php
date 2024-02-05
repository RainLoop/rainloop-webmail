<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mail;

class MessageListParams
{
	public string
		$sFolderName,
		$sSearch = '',
		$sSort = '';

	public ?\MailSo\Cache\CacheClient
		$oCacher = null;

	public bool
		$bUseSort = true,
		$bUseThreads = false,
		$bHideDeleted = true,
		$bSearchFuzzy = false;

	protected int
		$iOffset = 0,
		$iLimit = 0,
		$iPrevUidNext = 0, // used to check for new messages
		$iThreadUid = 0;

	/**
	 * Messages with message sequence numbers corresponding to the specified message sequence number set.
	 */
	public ?\MailSo\Imap\SequenceSet $oSequenceSet = null;

	public function __get($k)
	{
		return \property_exists($this, $k) ? $this->$k : null;
	}

	public function __set($k, $v)
	{
		if ('i' === $k[0]) {
			$this->$k = \max(0, (int) $v);
		}
//		0 > $oParams->iOffset
//		0 > $oParams->iLimit
//		999 < $oParams->iLimit
	}

	public function hash() : string
	{
		return \md5(\implode('-', [
			$this->sFolderName,
			$this->iOffset,
			$this->iLimit,
			$this->bHideDeleted ? '1' : '0',
			$this->sSearch,
			$this->bSearchFuzzy ? '1' : '0',
			$this->bUseSort ? $this->sSort : '0',
			$this->bUseThreads ? $this->iThreadUid : '',
			$this->iPrevUidNext
		]));
	}
}
