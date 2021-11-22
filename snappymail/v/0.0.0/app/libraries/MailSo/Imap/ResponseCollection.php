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

	public function getFetchResult($oLogger) : array
	{
		$aReturn = array();
		foreach ($this as $oResponse) {
			if (FetchResponse::IsValidFetchImapResponse($oResponse)) {
				if (FetchResponse::IsNotEmptyFetchImapResponse($oResponse)) {
					$aReturn[] = new FetchResponse($oResponse);
				} else if ($oLogger) {
					$oLogger->Write('Skipped Imap Response! ['.$oResponse->ToLine().']', \MailSo\Log\Enumerations\Type::NOTICE);
				}
			}
		}
		return $aReturn;
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
				$sFullNameRaw = $oImapClient->toUTF8($oResponse->ResponseList[2]);
				if (!isset($aReturn[$sFullNameRaw])) {
					$aReturn[$sFullNameRaw] = new Folder($sFullNameRaw);
				}
				$aReturn[$sFullNameRaw]->setStatusFromResponse($oResponse);
			}
			else if ($sStatus === $oResponse->StatusOrIndex && 5 == \count($oResponse->ResponseList)) {
				try
				{
					$sFullNameRaw = $oImapClient->toUTF8($oResponse->ResponseList[4]);

					/**
					 * $oResponse->ResponseList[0] = *
					 * $oResponse->ResponseList[1] = LIST (all) | LSUB (subscribed)
					 * $oResponse->ResponseList[2] = Flags
					 * $oResponse->ResponseList[3] = Delimiter
					 * $oResponse->ResponseList[4] = FullName
					 */
					if (!isset($aReturn[$sFullNameRaw])) {
						$oFolder = new Folder($sFullNameRaw,
							$oResponse->ResponseList[3], $oResponse->ResponseList[2]);
						$aReturn[$sFullNameRaw] = $oFolder;
					} else {
						$oFolder = $aReturn[$sFullNameRaw];
						$oFolder->setDelimiter($oResponse->ResponseList[3]);
						$oFolder->setFlags($oResponse->ResponseList[2]);
					}

					if ($oFolder->IsInbox()) {
						$bInbox = true;
					}

					if (!$sDelimiter) {
						$sDelimiter = $oFolder->Delimiter();
					}

					$aReturn[$sFullNameRaw] = $oFolder;
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

	public function getMessageSimpleSearchResult(bool $bReturnUid) : array
	{
		$aReturn = array();
		foreach ($this as $oResponse) {
			$iOffset = ($bReturnUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && 'SEARCH' === $oResponse->ResponseList[2]) ? 1 : 0;
			if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& ('SEARCH' === $oResponse->StatusOrIndex || $iOffset)
				&& \is_array($oResponse->ResponseList)
				&& 2 < \count($oResponse->ResponseList))
			{
				$iLen = \count($oResponse->ResponseList);
				for ($iIndex = 2 + $iOffset; $iIndex < $iLen; ++$iIndex) {
					$aReturn[] = (int) $oResponse->ResponseList[$iIndex];
				}
			}
		}
		return \array_reverse($aReturn);
	}

	public function getMessageSimpleSortResult(bool $bReturnUid) : array
	{
		$aReturn = array();
		foreach ($this as $oResponse) {
			$iOffset = ($bReturnUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && 'SORT' === $oResponse->ResponseList[2]) ? 1 : 0;
			if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& ('SORT' === $oResponse->StatusOrIndex || $iOffset)
				&& \is_array($oResponse->ResponseList)
				&& 2 < \count($oResponse->ResponseList))
			{
				$iLen = \count($oResponse->ResponseList);
				for ($iIndex = 2 + $iOffset; $iIndex < $iLen; ++$iIndex) {
					$aReturn[] = (int) $oResponse->ResponseList[$iIndex];
				}
			}
		}
		return $aReturn;
	}

	public function getMessageSimpleThreadResult(bool $bReturnUid) : array
	{
		$aReturn = array();
		foreach ($this as $oResponse) {
			$iOffset = ($bReturnUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && 'THREAD' === $oResponse->ResponseList[2]) ? 1 : 0;
			if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& ('THREAD' === $oResponse->StatusOrIndex || $iOffset)
				&& \is_array($oResponse->ResponseList)
				&& 2 < \count($oResponse->ResponseList))
			{
				$iLen = \count($oResponse->ResponseList);
				for ($iIndex = 2 + $iOffset; $iIndex < $iLen; ++$iIndex) {
					$aNewValue = $this->validateThreadItem($oResponse->ResponseList[$iIndex]);
					if (\is_array($aNewValue)) {
						$aReturn[] = $aNewValue;
					}
				}
			}
		}

		return $aReturn;
	}

	public function getNamespaceResult() : NamespaceResult
	{
		foreach ($this as $oResponse) {
			if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType &&
				'NAMESPACE' === $oResponse->StatusOrIndex)
			{
				$oReturn = new NamespaceResult;
				$oReturn->InitByImapResponse($oResponse);
				return $oReturn;
			}
		}
		throw new Exceptions\ResponseException;
	}

	public function getSimpleESearchOrESortResult(string $sRequestTag, bool $bReturnUid) : array
	{
		$aResult = array();
		foreach ($this as $oResponse) {
			if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& ('ESEARCH' === $oResponse->StatusOrIndex || 'SORT' === $oResponse->StatusOrIndex)
				&& \is_array($oResponse->ResponseList)
				&& isset($oResponse->ResponseList[2][1])
				&& 'TAG' === $oResponse->ResponseList[2][0] && $sRequestTag === $oResponse->ResponseList[2][1]
				&& (!$bReturnUid || (!empty($oResponse->ResponseList[3]) && 'UID' === $oResponse->ResponseList[3]))
			)
			{
				$i = \count($oResponse->ResponseList) - 1;
				while (3 < --$i) {
					$sItem = $oResponse->ResponseList[$i];
					switch ($sItem)
					{
						case 'ALL':
						case 'MAX':
						case 'MIN':
						case 'COUNT':
							$aResult[$sItem] = $oResponse->ResponseList[$i + 1];
							break;
					}
				}
			}
		}
		return $aResult;
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
