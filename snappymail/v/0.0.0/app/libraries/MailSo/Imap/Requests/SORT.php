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
class SORT extends Request
{
	public
		$sCriterias = 'ALL',
		$bUid = true,
		$sLimit = '',
		$aSortTypes = [],
		// rfc5267
		$aReturn = [
			/*
			   MIN
				  Return the message number/UID of the lowest sorted message
				  satisfying the search criteria.

			   MAX
				  Return the message number/UID of the highest sorted message
				  satisfying the search criteria.

			   ALL
				  Return all message numbers/UIDs which match the search criteria,
				  in the requested sort order, using a sequence-set.

			   COUNT
				  As in [ESEARCH].
			*/
		];

	public function SendRequestGetResponse() : \MailSo\Imap\ResponseCollection
	{
		if (!$this->aSortTypes) {
			$this->oImapClient->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$aRequest = array();

		if ($this->aReturn) {
			if (!$this->oImapClient->IsSupported('ESORT')) {
				$this->oImapClient->writeLogException(
					new \MailSo\Base\Exceptions\InvalidArgumentException,
					\MailSo\Log\Enumerations\Type::ERROR, true);
			}
			$aRequest[] = 'RETURN';
			$aRequest[] = $this->aReturn;
		}

		$aRequest[] = $this->aSortTypes;

		$sSearchCriterias = (\strlen($this->sCriterias) && '*' !== $this->sCriterias) ? $this->sCriterias : 'ALL';
		$aRequest[] = \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? 'US-ASCII' : 'UTF-8';
		$aRequest[] = $sSearchCriterias;

		if (\strlen($this->sLimit)) {
			$aRequest[] = $this->sLimit;
		}

		return $this->oImapClient->SendRequestGetResponse(
			($this->bUid ? 'UID SORT' : 'SORT'),
			$aRequest
		);
	}
}
