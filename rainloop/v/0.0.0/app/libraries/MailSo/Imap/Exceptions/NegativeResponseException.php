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
class NegativeResponseException extends \MailSo\Imap\Exceptions\ResponseException
{
	/**
	 * @return string
	 */
	public function getAlertFromStatus()
	{
		$sResult = '';

		$oResponse = $this->GetLastResponse();
		if ($oResponse && $oResponse->IsStatusResponse && !empty($oResponse->HumanReadable) &&
			isset($oResponse->OptionalResponse[0]) && 'ALERT' === $oResponse->OptionalResponse[0])
		{
			$sResult = $oResponse->HumanReadable;
		}

		return $sResult;
	}
}
