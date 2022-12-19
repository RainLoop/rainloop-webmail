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
	public
		$sFolderName, // string
		$sSearch = '', // string
		$oCacher = null, // ?\MailSo\Cache\CacheClient
		$bUseSortIfSupported = false, // bool
		$bUseThreads = false, // bool
		$bHideDeleted = true, // bool
		$sSort = ''; // string

	protected
		$iOffset = 0,
		$iLimit = 10,
		$iPrevUidNext = 0, // used to check for new messages
		$iThreadUid = 0;

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
}
