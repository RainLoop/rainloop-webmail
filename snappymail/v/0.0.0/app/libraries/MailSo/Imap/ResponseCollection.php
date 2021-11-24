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
				$aList = \array_map('strtoupper', $aList);
				\sort($aList);
				return $aList;
			}
		}
		return null;
	}

	public function getFoldersResult(string $sStatus, ImapClient $oImapClient) : array
	{
		$aReturn = array();

		$sDelimiter = '';
		$bInbox = false;
		foreach ($this as $oResponse) {
			if (Enumerations\ResponseType::UNTAGGED !== $oResponse->ResponseType) {
				continue;
			}
			if ('STATUS' === $oResponse->StatusOrIndex && isset($oResponse->ResponseList[2])) {
				$sFullName = $oImapClient->toUTF8($oResponse->ResponseList[2]);
				if (!isset($aReturn[$sFullName])) {
					$aReturn[$sFullName] = new Folder($sFullName);
				}
				$aReturn[$sFullName]->setStatusFromResponse($oResponse);
			}
			else if ($sStatus === $oResponse->StatusOrIndex && 5 == \count($oResponse->ResponseList)) {
				try
				{
					$sFullName = $oImapClient->toUTF8($oResponse->ResponseList[4]);

					/**
					 * $oResponse->ResponseList[0] = *
					 * $oResponse->ResponseList[1] = LIST (all) | LSUB (subscribed)
					 * $oResponse->ResponseList[2] = Flags
					 * $oResponse->ResponseList[3] = Delimiter
					 * $oResponse->ResponseList[4] = FullName
					 */
					if (!isset($aReturn[$sFullName])) {
						$oFolder = new Folder($sFullName,
							$oResponse->ResponseList[3], $oResponse->ResponseList[2]);
						$aReturn[$sFullName] = $oFolder;
					} else {
						$oFolder = $aReturn[$sFullName];
						$oFolder->setDelimiter($oResponse->ResponseList[3]);
						$oFolder->setFlags($oResponse->ResponseList[2]);
					}

					if ($oFolder->IsInbox()) {
						$bInbox = true;
					}

					if (!$sDelimiter) {
						$sDelimiter = $oFolder->Delimiter();
					}

					$aReturn[$sFullName] = $oFolder;
				}
				catch (\MailSo\Base\Exceptions\InvalidArgumentException $oException)
				{
					// TODO: writeLogException not accessible
					\error_log('ResponseCollection::getFoldersResult: '.$oException->getMessage());
//					$this->writeLogException($oException, \MailSo\Log\Enumerations\Type::WARNING, false);
				}
				catch (\Throwable $oException)
				{
					// TODO: writeLogException not accessible
					\error_log('ResponseCollection::getFoldersResult: '.$oException->getMessage());
//					$this->writeLogException($oException, \MailSo\Log\Enumerations\Type::WARNING, false);
				}
			}
		}

		if (!$bInbox && !isset($aReturn['INBOX'])) {
			$aReturn['INBOX'] = new Folder('INBOX', $sDelimiter);
		}

		return $aReturn;
	}

}
