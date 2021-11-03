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
 * https://datatracker.ietf.org/doc/html/rfc2087
 */

namespace MailSo\Imap\Commands;

/**
 * @category MailSo
 * @package Imap
 */
trait Quota
{
	/**
	 * https://datatracker.ietf.org/doc/html/rfc2087#section-4.2
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Quota(string $sRootName = '') : ?array
	{
		return $this->IsSupported('QUOTA')
			? $this->SendRequestGetResponse("GETQUOTA {$this->EscapeString($sRootName)}")->getQuotaResult()
			: null;
	}

	/**
	 * https://datatracker.ietf.org/doc/html/rfc2087#section-4.3
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function QuotaRoot(string $sFolderName = 'INBOX') : ?array
	{
		return $this->IsSupported('QUOTA')
			? $this->SendRequestGetResponse("GETQUOTAROOT {$this->EscapeString($sFolderName)}")->getQuotaResult()
			: null;
	}
}
