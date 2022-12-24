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

namespace MailSo\Imap\Commands;

use MailSo\Imap\FetchResponse;
use MailSo\Imap\Enumerations\FetchType;
use MailSo\Imap\ResponseCollection;
use MailSo\Imap\SequenceSet;
use MailSo\Imap\Enumerations\MessageFlag;
use MailSo\Imap\Enumerations\ResponseType;
use MailSo\Imap\Enumerations\StoreAction;

/**
 * @category MailSo
 * @package Imap
 */
trait Messages
{
	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function Fetch(array $aInputFetchItems, string $sIndexRange, bool $bIndexIsUid) : array
	{
		if (!\strlen(\trim($sIndexRange))) {
			$this->writeLogException(new \InvalidArgumentException, \LOG_ERR);
		}

		$aReturn = array();
		$this->aFetchCallbacks = array();
		try {
			$aFetchItems = array(
				FetchType::UID,
				FetchType::RFC822_SIZE
			);
			foreach ($aInputFetchItems as $mFetchKey) {
				switch ($mFetchKey)
				{
					case FetchType::UID:
					case FetchType::RFC822_SIZE:
						// Already defined by default
						break;

					// Macro's
					case FetchType::FULL:
						$aFetchItems[] = FetchType::BODY;
						// Falls through
					case FetchType::ALL:
						$aFetchItems[] = FetchType::ENVELOPE;
						// Falls through
					case FetchType::FAST:
						$aFetchItems[] = FetchType::FLAGS;
						$aFetchItems[] = FetchType::INTERNALDATE;
						break;

					default:
						if (\is_string($mFetchKey)) {
							$aFetchItems[] = $mFetchKey;
						} else if (\is_array($mFetchKey) && 2 === \count($mFetchKey)
							&& \is_string($mFetchKey[0]) && \is_callable($mFetchKey[1]))
						{
							$aFetchItems[] = $mFetchKey[0];
							$this->aFetchCallbacks[$mFetchKey[0]] = $mFetchKey[1];
						}
						break;
				}
			}
			if ($this->hasCapability('OBJECTID')) {
				$aFetchItems[] = FetchType::EMAILID;
				$aFetchItems[] = FetchType::THREADID;
			} else if ($this->hasCapability('X-GM-EXT-1')) {
				// https://developers.google.com/gmail/imap/imap-extensions
				$aFetchItems[] = 'X-GM-MSGID';
				$aFetchItems[] = 'X-GM-THRID';
/*
			} else if ($this->hasCapability('X-DOVECOT')) {
				$aFetchItems[] = 'X-GUID';
*/
			}
/*
			if ($this->hasCapability('X-GM-EXT-1') && \in_array(FetchType::FLAGS, $aFetchItems)) {
				$aFetchItems[] = 'X-GM-LABELS';
			}
*/

			$aParams = array($sIndexRange, $aFetchItems);

			/**
			 * TODO:
			 *   https://datatracker.ietf.org/doc/html/rfc4551#section-3.3.1
			 *     $aParams[1][] = FLAGS
			 *     $aParams[] = (CHANGEDSINCE $modsequence)
			 *   https://datatracker.ietf.org/doc/html/rfc4551#section-3.3.2
			 *     $aParams[1][] = MODSEQ
			 *   https://datatracker.ietf.org/doc/html/rfc5162#section-3.2
			 *     $bIndexIsUid && $aParams[] = (CHANGEDSINCE $modsequence VANISHED)
			 */

			$this->SendRequest($bIndexIsUid ? 'UID FETCH' : 'FETCH', $aParams);
			foreach ($this->yieldUntaggedResponses() as $oResponse) {
				if (FetchResponse::isValidImapResponse($oResponse)) {
					if (FetchResponse::hasUidAndSize($oResponse)) {
						$aReturn[] = new FetchResponse($oResponse);
					} else if ($this->oLogger) {
						$this->oLogger->Write('Skipped Imap Response! ['.$oResponse.']', \LOG_NOTICE);
					}
				}
			}
		} finally {
			$this->aFetchCallbacks = array();
		}

		return $aReturn;
	}

	/**
	 * Appends message to specified folder
	 *
	 * @param resource $rMessageAppendStream
	 *
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageAppendStream(string $sFolderName, $rMessageAppendStream, int $iStreamSize, array $aFlagsList = null, int $iDateTime = 0) : ?int
	{
		$aParams = array(
			$this->EscapeFolderName($sFolderName),
			$aFlagsList
		);
		if (0 < $iDateTime) {
			$aParams[] = $this->EscapeString(\gmdate('d-M-Y H:i:s', $iDateTime).' +0000');
		}

/*
		// RFC 3516 || RFC 6855 section-4
		if ($this->hasCapability('BINARY') || $this->hasCapability('UTF8=ACCEPT')) {
			$aParams[] = '~{'.$iStreamSize.'}';
		}
*/
		$aParams[] = '{'.$iStreamSize.'}';

		$this->SendRequestGetResponse('APPEND', $aParams);

		return $this->writeMessageStream($rMessageAppendStream);
	}

	private function writeMessageStream($rMessageStream) : ?int
	{
		$this->writeLog('Write to connection stream', \LOG_INFO);

		\MailSo\Base\Utils::MultipleStreamWriter($rMessageStream, array($this->ConnectionResource()));

		$this->sendRaw('');
		$oResponses = $this->getResponse();
		/**
		 * Can be tagged
			 S: A003 OK [APPENDUID 1 2001] APPEND completed
		 * Or untagged
			 S: * OK [APPENDUID 1 2001] Replacement Message ready
		 */
		foreach ($oResponses as $oResponse) {
			if (\is_array($oResponse->OptionalResponse)
			 && !empty($oResponse->OptionalResponse[2])
			 && \is_numeric($oResponse->OptionalResponse[2])
			 && 'APPENDUID' === \strtoupper($oResponse->OptionalResponse[0])
			) {
				return (int) $oResponse->OptionalResponse[2];
			}
		}

		return null;
	}

	/**
	 * RFC 3502 MULTIAPPEND
	public function MessageAppendStreams(string $sFolderName, $rMessageAppendStream, int $iStreamSize, array $aFlagsList = null, int &$iUid = null, int $iDateTime = 0) : ?int
	*/

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageCopy(string $sFromFolder, string $sToFolder, SequenceSet $oRange) : ResponseCollection
	{
		if (!$sFromFolder || !$sToFolder || !\count($oRange)) {
			$this->writeLogException(new \InvalidArgumentException, \LOG_ERR);
		}

		$this->FolderSelect($sFromFolder);

		return $this->SendRequestGetResponse(
			$oRange->UID ? 'UID COPY' : 'COPY',
			array((string) $oRange, $this->EscapeFolderName($sToFolder))
		);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageMove(string $sFromFolder, string $sToFolder, SequenceSet $oRange) : void
	{
		if (!$sFromFolder || !$sToFolder || !\count($oRange)) {
			$this->writeLogException(new \InvalidArgumentException, \LOG_ERR);
		}

		if ($this->hasCapability('MOVE')) {
			$this->FolderSelect($sFromFolder);
			$this->SendRequestGetResponse(
				$oRange->UID ? 'UID MOVE' : 'MOVE',
				array((string) $oRange, $this->EscapeFolderName($sToFolder))
			);
		} else {
			$this->MessageCopy($sFromFolder, $sToFolder, $oRange);
			$this->MessageDelete($sFromFolder, $oRange, true);
		}
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageDelete(string $sFolder, SequenceSet $oRange, bool $bExpungeAll = false) : void
	{
		if (!$sFolder || !\count($oRange)) {
			$this->writeLogException(new \InvalidArgumentException, \LOG_ERR);
		}

		$this->FolderSelect($sFolder);

		$this->MessageStoreFlag($oRange,
			array(MessageFlag::DELETED),
			StoreAction::ADD_FLAGS_SILENT
		);

		if ($bExpungeAll && $this->Settings->expunge_all_on_delete) {
			$this->FolderExpunge();
		} else {
			$this->FolderExpunge($oRange);
		}
	}

	/**
	 * RFC 8508 REPLACE
	 * Replaces message in specified folder
	 * When $iUid < 1 it only appends the message
	 *
	 * @param resource $rMessageStream
	 *
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageReplaceStream(string $sFolderName, int $iUid, $rMessageStream, int $iStreamSize, array $aFlagsList = null, int $iDateTime = 0) : ?int
	{
		if (1 > $iUid || !$this->hasCapability('REPLACE')) {
			$this->FolderSelect($sFolderName);
			$iNewUid = $this->MessageAppendStream($sFolderName, $rMessageStream, $iStreamSize, $aFlagsList, $iDateTime);
			if ($iUid) {
				$oRange = new SequenceSet([$iUid]);
				$this->MessageStoreFlag($oRange,
					array(MessageFlag::DELETED),
					StoreAction::ADD_FLAGS_SILENT
				);
				$this->FolderExpunge($oRange);
			}
			return $iNewUid;
		}

		$aParams = array(
			$iUid,
			$this->EscapeFolderName($sFolderName),
			$aFlagsList
		);
		if (0 < $iDateTime) {
			$aParams[] = $this->EscapeString(\gmdate('d-M-Y H:i:s', $iDateTime).' +0000');
		}

/*
		// RFC 3516 || RFC 6855 section-4
		if ($this->hasCapability('BINARY') || $this->hasCapability('UTF8=ACCEPT')) {
			$aParams[] = '~{'.$iStreamSize.'}';
		}
*/
		$aParams[] = '{'.$iStreamSize.'}';

		$this->SendRequestGetResponse('UID REPLACE', $aParams);

		return $this->writeMessageStream($rMessageStream);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 * $sStoreAction = \MailSo\Imap\Enumerations\StoreAction::ADD_FLAGS_SILENT
	 */
	public function MessageStoreFlag(SequenceSet $oRange, array $aInputStoreItems, string $sStoreAction) : ?ResponseCollection
	{
		if (!\count($oRange) || !\strlen(\trim($sStoreAction)) || !\count($aInputStoreItems)) {
			return null;
		}

		/**
		 * TODO:
		 *   https://datatracker.ietf.org/doc/html/rfc4551#section-3.2
		 *     $sStoreAction[] = (UNCHANGEDSINCE $modsequence)
		 */

		$aInputStoreItems = \array_map('\\MailSo\\Base\\Utils::Utf8ToUtf7Modified', $aInputStoreItems);

		return $this->SendRequestGetResponse(
			$oRange->UID ? 'UID STORE' : 'STORE',
			array((string) $oRange, $sStoreAction, $aInputStoreItems)
		);
	}

	/**
	 * See https://tools.ietf.org/html/rfc5256
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageSimpleSort(array $aSortTypes, string $sSearchCriterias = 'ALL', bool $bReturnUid = true) : array
	{
		$oSort = new \MailSo\Imap\Requests\SORT($this);
		$oSort->sCriterias = $sSearchCriterias;
		$oSort->bUid = $bReturnUid;
		$oSort->aSortTypes = $aSortTypes;
		$oSort->SendRequest();
		$aReturn = array();
		foreach ($this->yieldUntaggedResponses() as $oResponse) {
			$iOffset = ($bReturnUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && 'SORT' === $oResponse->ResponseList[2]) ? 1 : 0;
			if (\is_array($oResponse->ResponseList)
				&& 2 < \count($oResponse->ResponseList)
				&& ('SORT' === $oResponse->StatusOrIndex || $iOffset))
			{
				$iLen = \count($oResponse->ResponseList);
				for ($iIndex = 2 + $iOffset; $iIndex < $iLen; ++$iIndex) {
					$aReturn[] = (int) $oResponse->ResponseList[$iIndex];
				}
			}
		}
		return $aReturn;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageSimpleESearch(string $sSearchCriterias = 'ALL', array $aSearchReturn = null, bool $bReturnUid = true, string $sCharset = '', string $sLimit = '') : array
	{
		$oESearch = new \MailSo\Imap\Requests\ESEARCH($this);
		$oESearch->sCriterias = $sSearchCriterias;
		$oESearch->aReturn = $aSearchReturn;
		$oESearch->bUid = $bReturnUid;
		$oESearch->sLimit = $sLimit;
		$oESearch->sCharset = $sCharset;
		$oESearch->SendRequest();
		return $this->getSimpleESearchOrESortResult($bReturnUid);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageSimpleESort(array $aSortTypes, string $sSearchCriterias = 'ALL', array $aSearchReturn = ['ALL'], bool $bReturnUid = true, string $sLimit = '') : array
	{
		$oSort = new \MailSo\Imap\Requests\SORT($this);
		$oSort->sCriterias = $sSearchCriterias;
		$oSort->bUid = $bReturnUid;
		$oSort->aSortTypes = $aSortTypes;
		$oSort->aReturn = $aSearchReturn ?: ['ALL'];
		$oSort->sLimit = $sLimit;
		$oSort->SendRequest();
		return $this->getSimpleESearchOrESortResult($bReturnUid);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageSimpleSearch(string $sSearchCriterias = 'ALL', bool $bReturnUid = true, string $sCharset = '') : array
	{
		$aRequest = array();
		if (\strlen($sCharset)) {
			$aRequest[] = 'CHARSET';
			$aRequest[] = \strtoupper($sCharset);
		}

		$aRequest[] = !\strlen($sSearchCriterias) || '*' === $sSearchCriterias ? 'ALL' : $sSearchCriterias;

		$sCont = $this->SendRequest($bReturnUid ? 'UID SEARCH' : 'SEARCH', $aRequest, true);
		$oResult = $this->getResponse();
		if ('' !== $sCont) {
			$oItem = $oResult->getLast();
			if ($oItem && ResponseType::CONTINUATION === $oItem->ResponseType) {
				$aParts = \explode("\r\n", $sCont);
				foreach ($aParts as $sLine) {
					$this->sendRaw($sLine);
					$oResult = $this->getResponse();
					$oItem = $oResult->getLast();
					if ($oItem && ResponseType::CONTINUATION === $oItem->ResponseType) {
						continue;
					}
				}
			}
		}

		$aReturn = array();
		foreach ($oResult as $oResponse) {
			$iOffset = ($bReturnUid && 'UID' === $oResponse->StatusOrIndex && !empty($oResponse->ResponseList[2]) && 'SEARCH' === $oResponse->ResponseList[2]) ? 1 : 0;
			if (ResponseType::UNTAGGED === $oResponse->ResponseType
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

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageSimpleThread(string $sSearchCriterias = 'ALL', bool $bReturnUid = true) : iterable
	{
		$oThread = new \MailSo\Imap\Requests\THREAD($this);
		$oThread->sCriterias = $sSearchCriterias;
		$oThread->bUid = $bReturnUid;
		yield from $oThread->SendRequestIterateResponse();
	}

	private function getSimpleESearchOrESortResult(bool $bReturnUid) : array
	{
		$sRequestTag = $this->getCurrentTag();
		$aResult = array();
		foreach ($this->yieldUntaggedResponses() as $oResponse) {
			if (\is_array($oResponse->ResponseList)
				&& isset($oResponse->ResponseList[2][1])
				&& ('ESEARCH' === $oResponse->StatusOrIndex || 'SORT' === $oResponse->StatusOrIndex)
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

}
