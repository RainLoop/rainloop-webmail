<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Commands;

/**
 * @category MailSo
 * @package Imap
 */
trait UrlAuth
{
	/**
	 * https://datatracker.ietf.org/doc/html/rfc4467#section-7
	 */
	public function RESETKEY(string $sFolderName, string $sMechanism)
	{
		$aParams = [];
		if ($sFolderName) {
			$aParams[] = $this->EscapeFolderName($sFolderName);
		}
		if ($sMechanism) {
			$aParams[] = $this->EscapeString($sMechanism);
		}
		$oResponses = $this->SendRequestGetResponse('RESETKEY', $aParams);
		return null;
	}

	public function GENURLAUTH(string $sMechanisms)
	{
		$oResponses = $this->SendRequestGetResponse('GENURLAUTH', array(
			$this->EscapeString($sMechanism)
		));
		return null;
	}

	public function URLFETCH(string $sURLs)
	{
		$oResponses = $this->SendRequestGetResponse('URLFETCH', array(
			$this->EscapeString($sURLs)
		));
		return null;
	}

}
