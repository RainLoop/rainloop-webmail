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
		$iOffset = 0, // int
		$iLimit = 10, // int
		$sSearch = '', // string
		$iPrevUidNext = 0, // int
		$oCacher = null, // ?\MailSo\Cache\CacheClient
		$bUseSortIfSupported = false, // bool
		$bUseThreads = false, // bool
		$iThreadUid = 0, // int
		$sSort = ''; // string
}
