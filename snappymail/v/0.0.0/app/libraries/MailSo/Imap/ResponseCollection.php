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
			if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& \is_array($oResponse->ResponseList))
			{
				$aList = null;
				if (isset($oResponse->ResponseList[1]) && \is_string($oResponse->ResponseList[1]) &&
					'CAPABILITY' === \strtoupper($oResponse->ResponseList[1]))
				{
					$aList = \array_slice($oResponse->ResponseList, 2);
				}
				else if ($oResponse->OptionalResponse && \is_array($oResponse->OptionalResponse) &&
					1 < \count($oResponse->OptionalResponse) && \is_string($oResponse->OptionalResponse[0]) &&
					'CAPABILITY' === \strtoupper($oResponse->OptionalResponse[0]))
				{
					$aList = \array_slice($oResponse->OptionalResponse, 1);
				}

				if (\is_array($aList) && 0 < \count($aList)) {
					return \array_map('strtoupper', $aList);
				}
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

	/**
	 * @param array|string $mName
	 */
	private function getArrayNameToStringName($mName) : string
	{
		if (\is_string($mName))
		{
			return $mName;
		}

		if (\is_array($mName))
		{
			if (0 === \count($mName))
			{
				return '[]';
			}

			foreach ($mName as &$mSubName)
			{
				$mSubName = "[{$this->getArrayNameToStringName($mSubName)}]";
			}

			return \implode('', $mName);
		}

		return '';
	}

	public function getFoldersResult(string $sStatus, bool $bUseListStatus = false) : array
	{
		$aReturn = array();

		$sDelimiter = '';
		$bInbox = false;

		foreach ($this as $oResponse) {
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType &&
				$sStatus === $oResponse->StatusOrIndex && 5 <= count($oResponse->ResponseList))
			{
				try
				{
					/**
					 * A bug in the parser converts folder names that start with '[' into arrays,
					 * and subfolders are in $oResponse->ResponseList[5+]
					 * https://github.com/the-djmaze/snappymail/issues/1
					 * https://github.com/the-djmaze/snappymail/issues/70
					 */
					$aFullNameRawList = \array_slice($oResponse->ResponseList, 4);
					foreach ($aFullNameRawList as &$sName) {
						$sName = $this->getArrayNameToStringName($sName);
					}

					$sFullNameRaw = \implode('', $aFullNameRawList);

					$oFolder = new Folder($sFullNameRaw,
						$oResponse->ResponseList[3], $oResponse->ResponseList[2]);

					if ($oFolder->IsInbox()) {
						$bInbox = true;
					}

					if (empty($sDelimiter)) {
						$sDelimiter = $oFolder->Delimiter();
					}

					$aReturn[] = $oFolder;
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

		if (!$bInbox && !empty($sDelimiter)) {
			$aReturn[] = new Folder('INBOX', $sDelimiter);
		}

		if ($bUseListStatus) {
			foreach ($this as $oResponse) {
				if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType &&
					'STATUS' === $oResponse->StatusOrIndex &&
					isset($oResponse->ResponseList[2]) &&
					isset($oResponse->ResponseList[3]) &&
					\is_array($oResponse->ResponseList[3]))
				{
					$sFolderNameRaw = $oResponse->ResponseList[2];

					$oCurrentFolder = null;
					foreach ($aReturn as $oFolder) {
						if ($oFolder && $sFolderNameRaw === $oFolder->FullNameRaw()) {
							$oCurrentFolder =& $oFolder;
							break;
						}
					}

					if (null !== $oCurrentFolder) {
						$sName = null;
						$aStatus = array();

						foreach ($oResponse->ResponseList[3] as $sArrayItem) {
							if (null === $sName) {
								$sName = $sArrayItem;
							} else {
								$aStatus[$sName] = $sArrayItem;
								$sName = null;
							}
						}

						if (0 < count($aStatus)) {
							$oCurrentFolder->SetExtended('STATUS', $aStatus);
						}
					}

					unset($oCurrentFolder);
				}
			}
		}

		return $aReturn;
	}

	public function getMessageSimpleSearchResult(string $sStatus, bool $bReturnUid) : array
	{
		$aReturn = array();
		foreach ($this as $oResponse) {
			$iOffset = ($bReturnUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && $sStatus === $oResponse->ResponseList[2]) ? 1 : 0;
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& ($sStatus === $oResponse->StatusOrIndex || $iOffset)
				&& \is_array($oResponse->ResponseList)
				&& 2 < count($oResponse->ResponseList))
			{
				$iLen = \count($oResponse->ResponseList);
				for ($iIndex = 2 + $iOffset; $iIndex < $iLen; ++$iIndex) {
					$aReturn[] = (int) $oResponse->ResponseList[$iIndex];
				}
			}
		}
		return \array_reverse($aReturn);
	}

	public function getMessageSimpleSortResult(string $sStatus, bool $bReturnUid) : array
	{
		$aReturn = array();
		foreach ($this as $oResponse) {
			$iOffset = ($bReturnUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && $sStatus === $oResponse->ResponseList[2]) ? 1 : 0;
			if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& ($sStatus === $oResponse->StatusOrIndex || $iOffset)
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

	public function getMessageSimpleThreadResult(string $sStatus, bool $bReturnUid) : array
	{
		$aReturn = array();
		foreach ($this as $oResponse) {
			$iOffset = ($bReturnUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && $sStatus === $oResponse->ResponseList[2]) ? 1 : 0;
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& ($sStatus === $oResponse->StatusOrIndex || $iOffset)
				&& \is_array($oResponse->ResponseList)
				&& 2 < \count($oResponse->ResponseList))
			{
				$iLen = \count($oResponse->ResponseList);
				for ($iIndex = 2 + $iOffset; $iIndex < $iLen; ++$iIndex) {
					$aNewValue = $this->validateThreadItem($oResponse->ResponseList[$iIndex]);
					if (false !== $aNewValue) {
						$aReturn[] = $aNewValue;
					}
				}
			}
		}
		return $aReturn;
	}

	public function getCurrentFolderInformation(string $sFolderName, bool $bIsWritable) : FolderInformation
	{
		$oResult = new FolderInformation($sFolderName, $bIsWritable);
		foreach ($this as $oResponse) {
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType) {
				if (\count($oResponse->ResponseList) > 2 &&
					'FLAGS' === $oResponse->ResponseList[1] && \is_array($oResponse->ResponseList[2]))
				{
					$oResult->Flags = $oResponse->ResponseList[2];
				}

				if (is_array($oResponse->OptionalResponse) && \count($oResponse->OptionalResponse) > 1) {
					if ('PERMANENTFLAGS' === $oResponse->OptionalResponse[0] &&
						is_array($oResponse->OptionalResponse[1]))
					{
						$oResult->PermanentFlags = $oResponse->OptionalResponse[1];
					}
					else if ('UIDVALIDITY' === $oResponse->OptionalResponse[0] &&
						isset($oResponse->OptionalResponse[1]))
					{
						$oResult->Uidvalidity = $oResponse->OptionalResponse[1];
					}
					else if ('UNSEEN' === $oResponse->OptionalResponse[0] &&
						isset($oResponse->OptionalResponse[1]) &&
						is_numeric($oResponse->OptionalResponse[1]))
					{
						$oResult->Unread = (int) $oResponse->OptionalResponse[1];
					}
					else if ('UIDNEXT' === $oResponse->OptionalResponse[0] &&
						isset($oResponse->OptionalResponse[1]))
					{
						$oResult->Uidnext = $oResponse->OptionalResponse[1];
					}
					else if ('HIGHESTMODSEQ' === $oResponse->OptionalResponse[0] &&
						isset($oResponse->OptionalResponse[1]) &&
						\is_numeric($oResponse->OptionalResponse[1]))
					{
						$oResult->HighestModSeq = \trim($oResponse->OptionalResponse[1]);
					}
				}

				if (\count($oResponse->ResponseList) > 2 &&
					\is_string($oResponse->ResponseList[2]) &&
					\is_numeric($oResponse->ResponseList[1]))
				{
					switch ($oResponse->ResponseList[2])
					{
						case 'EXISTS':
							$oResult->Exists = (int) $oResponse->ResponseList[1];
							break;
						case 'RECENT':
							$oResult->Recent = (int) $oResponse->ResponseList[1];
							break;
					}
				}
			}
		}

		return $oResult;
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

	public function getQuotaResult() : array
	{
		$aReturn = array(0, 0);
		foreach ($this as $oResponse) {
			if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& 'QUOTA' === $oResponse->StatusOrIndex
				&& \is_array($oResponse->ResponseList)
				&& isset($oResponse->ResponseList[3])
				&& \is_array($oResponse->ResponseList[3])
				&& 2 < \count($oResponse->ResponseList[3])
				&& 'STORAGE' === \strtoupper($oResponse->ResponseList[3][0])
				&& \is_numeric($oResponse->ResponseList[3][1])
				&& \is_numeric($oResponse->ResponseList[3][2])
			)
			{
				$aReturn = array(
					(int) $oResponse->ResponseList[3][1],
					(int) $oResponse->ResponseList[3][2],
					0,
					0
				);

				if (5 < \count($oResponse->ResponseList[3])
					&& 'MESSAGE' === \strtoupper($oResponse->ResponseList[3][3])
					&& \is_numeric($oResponse->ResponseList[3][4])
					&& \is_numeric($oResponse->ResponseList[3][5])
				)
				{
					$aReturn[2] = (int) $oResponse->ResponseList[3][4];
					$aReturn[3] = (int) $oResponse->ResponseList[3][5];
				}
			}
		}

		return $aReturn;
	}

	public function getSimpleESearchOrESortResult(string $sRequestTag, bool $bReturnUid) : array
	{
		$aResult = array();
		foreach ($this as $oResponse) {
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& ('ESEARCH' === $oResponse->StatusOrIndex || 'ESORT' === $oResponse->StatusOrIndex)
				&& \is_array($oResponse->ResponseList)
				&& isset($oResponse->ResponseList[2], $oResponse->ResponseList[2][0], $oResponse->ResponseList[2][1])
				&& 'TAG' === $oResponse->ResponseList[2][0] && $sRequestTag === $oResponse->ResponseList[2][1]
				&& (!$bReturnUid || ($bReturnUid && !empty($oResponse->ResponseList[3]) && 'UID' === $oResponse->ResponseList[3]))
			)
			{
				$iStart = 3;
				foreach ($oResponse->ResponseList as $iIndex => $mItem) {
					if ($iIndex >= $iStart) {
						switch ($mItem)
						{
							case 'ALL':
							case 'MAX':
							case 'MIN':
							case 'COUNT':
								if (isset($oResponse->ResponseList[$iIndex + 1])) {
									$aResult[$mItem] = $oResponse->ResponseList[$iIndex + 1];
								}
								break;
						}
					}
				}
			}
		}
		return $aResult;
	}

	public function getStatusFolderInformationResult() : array
	{
		$aReturn = array();
		foreach ($this as $oResponse) {
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType &&
				'STATUS' === $oResponse->StatusOrIndex && isset($oResponse->ResponseList[3]) &&
				\is_array($oResponse->ResponseList[3]))
			{
				$sName = null;
				foreach ($oResponse->ResponseList[3] as $sArrayItem) {
					if (null === $sName) {
						$sName = $sArrayItem;
					} else {
						$aReturn[$sName] = $sArrayItem;
						$sName = null;
					}
				}
			}
		}
		return $aReturn;
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
