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
				new \MailSo\Imap\Exceptions\RuntimeException('THREAD is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
		parent::__construct($oImapClient);
	}

	public function SendRequestIterateResponse() : iterable
	{
		if (!$this->oImapClient->IsSupported(\strtoupper("THREAD={$this->sAlgorithm}"))) {
			$this->oImapClient->writeLogException(
				new \MailSo\Imap\Exceptions\RuntimeException("THREAD={$this->sAlgorithm} is not supported"),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->oImapClient->SendRequest(
			($this->bUid ? 'UID THREAD' : 'THREAD'),
			array(
				$this->sAlgorithm,
				'UTF-8', // \strtoupper(\MailSo\Base\Enumerations\Charset::UTF_8)
				(\strlen($this->sCriterias) && '*' !== $this->sCriterias) ? $this->sCriterias : 'ALL'
			)
		);

		foreach ($this->oImapClient->yieldUntaggedResponses() as $oResponse) {
			$iOffset = ($this->bUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && 'THREAD' === $oResponse->ResponseList[2]) ? 1 : 0;
			if (('THREAD' === $oResponse->StatusOrIndex || $iOffset)
				&& \is_array($oResponse->ResponseList)
				&& 2 < \count($oResponse->ResponseList))
			{
				$iLen = \count($oResponse->ResponseList);
				for ($iIndex = 2 + $iOffset; $iIndex < $iLen; ++$iIndex) {
					$aNewValue = $this->validateThreadItem($oResponse->ResponseList[$iIndex]);
					if (\is_array($aNewValue)) {
						yield $aNewValue;
					}
				}
			}
		}
	}

	/**
	 * @param mixed $mValue
	 *
	 * @return mixed
	 */
	private function validateThreadItem($mValue)
	{
		$mResult = false;
		if (\is_numeric($mValue)) {
			$mResult = (int) $mValue;
			if (0 >= $mResult) {
				$mResult = false;
			}
		} else if (\is_array($mValue)) {
			if (1 === \count($mValue) && \is_numeric($mValue[0])) {
				$mResult = (int) $mValue[0];
				if (0 >= $mResult) {
					$mResult = false;
				}
			} else {
				$mResult = array();
				foreach ($mValue as $mValueItem) {
					$mTemp = $this->validateThreadItem($mValueItem);
					if (false !== $mTemp) {
						$mResult[] = $mTemp;
					}
				}
			}
		}

		return $mResult;
	}
}
