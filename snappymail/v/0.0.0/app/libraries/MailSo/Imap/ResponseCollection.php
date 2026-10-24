<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 * (c) 2020 Dj Maze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Imap
 */
class ResponseCollection extends \MailSo\Base\Collection
{
	public function append($oResponse, bool $bToTop = false) : void
	{
		assert($oResponse instanceof Response);
		parent::append($oResponse, $bToTop);
	}

	public function getLast() : ?Response
	{
		$iLast = \count($this);
		return $iLast ? $this[$iLast-1] : null;
	}

	public function validate() : self
	{
		$oItem = $this->getLast();
		if (!$oItem) {
			throw new Exceptions\ResponseNotFoundException;
		}

		if ($oItem->ResponseType !== Enumerations\ResponseType::CONTINUATION) {
			if (!$oItem->IsStatusResponse) {
				throw new Exceptions\InvalidResponseException($this);
			}

			if (Enumerations\ResponseStatus::OK !== $oItem->StatusOrIndex) {
				throw new Exceptions\NegativeResponseException($this);
			}
		}
		return $this;
	}

	public function getCapabilityResult() : ?array
	{
		foreach ($this as $oResponse) {
			$aList = null;
			// ResponseList[2][0] => CAPABILITY
			if (isset($oResponse->ResponseList[1]) && \is_string($oResponse->ResponseList[1]) &&
				'CAPABILITY' === \strtoupper($oResponse->ResponseList[1]))
			{
				$aList = \array_slice($oResponse->ResponseList, 2);
			}
			else if (\is_array($oResponse->OptionalResponse) &&
				1 < \count($oResponse->OptionalResponse) && \is_string($oResponse->OptionalResponse[0]) &&
				'CAPABILITY' === \strtoupper($oResponse->OptionalResponse[0]))
			{
				$aList = \array_slice($oResponse->OptionalResponse, 1);
			}

			if (\is_array($aList) && \count($aList)) {
				return \array_map('strtoupper', $aList);
			}
		}
		return null;
	}
}
