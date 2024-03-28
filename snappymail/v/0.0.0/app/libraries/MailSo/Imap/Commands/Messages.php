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
	 * @throws \ValueError
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FetchIterate(array $aInputFetchItems, string $sIndexRange, bool $bIndexIsUid) : iterable
	{
		if (!\strlen(\trim($sIndexRange))) {
			$this->writeLogException(new \ValueError('$sIndexRange is empty'), \LOG_ERR);
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
						yield new FetchResponse($oResponse);
					} else {
						$this->logWrite('Skipped Imap Response! ['.$oResponse.']', \LOG_NOTICE);
					}
				}
			}
		} finally {
			$this->aFetchCallbacks = array();
		}
	}

	public function Fetch(array $aInputFetchItems, string $sIndexRange, bool $bIndexIsUid) : array
	{
		$aReturn = array();
		foreach ($this->FetchIterate($aInputFetchItems, $sIndexRange, $bIndexIsUid) as $oFetchResponse) {
			$aReturn[] = $oFetchResponse;
		}
		return $aReturn;
	}

	public function FetchMessagePart(int $iUid, string $sPartId) : string
	{
		if ('TEXT' === $sPartId) {
			$oFetchResponse = $this->Fetch([
				FetchType::BODY_PEEK.'['.$sPartId.']',
				FetchType::BODY_HEADER_PEEK
			], $iUid, true)[0];
			$sHeader = $oFetchResponse->GetFetchValue(FetchType::BODY_HEADER);
		} else {
			$oFetchResponse = $this->Fetch([
				FetchType::BODY_PEEK.'['.$sPartId.']',
				// An empty section specification refers to the entire message, including the header.
				// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
				FetchType::BODY_PEEK.'['.$sPartId.'.MIME]'
			], $iUid, true)[0];
			$sHeader = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sPartId.'.MIME]');
		}
		return $sHeader . $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sPartId.']');
	}

	/**
	 * Appends message to specified folder
	 *
	 * @param resource $rMessageStream
	 *
	 * @throws \InvalidArgumentException
	 * @throws \ValueError
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageAppendStream(string $sFolderName, $rMessageStream, int $iStreamSize, array $aFlagsList = null, int $iDateTime = 0) : ?int
	{
		if (!\is_resource($rMessageStream)) {
			throw new \InvalidArgumentException('$rMessageStream must be a resource');
		}
		if (!\strlen($sFolderName)) {
			throw new \ValueError('$sFolderName is empty');
		}
		if (1 > $iStreamSize) {
			throw new \ValueError('$iStreamSize must be higher then 0');
		}

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

		return $this->writeMessageStream($rMessageStream);
	}

	private function writeMessageStream($rMessageStream) : ?int
	{
		$this->writeLog('Write to connection stream', \LOG_INFO);

		\MailSo\Base\Utils::WriteStream($rMessageStream, $this->ConnectionResource());

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
	 * @throws \ValueError
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageCopy(string $sFromFolder, string $sToFolder, SequenceSet $oRange) : ResponseCollection
	{
		if (!$sFromFolder || !$sToFolder || !\count($oRange)) {
			$this->writeLogException(new \ValueError, \LOG_ERR);
		}

		$this->FolderSelect($sFromFolder);

		return $this->SendRequestGetResponse(
			$oRange->UID ? 'UID COPY' : 'COPY',
			array((string) $oRange, $this->EscapeFolderName($sToFolder))
		);
	}

	/**
	 * @throws \ValueError
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageMove(string $sFromFolder, string $sToFolder, SequenceSet $oRange) : void
	{
		if (!$sFromFolder || !$sToFolder || !\count($oRange)) {
			$this->writeLogException(new \ValueError, \LOG_ERR);
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
	 * @throws \ValueError
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageDelete(string $sFolder, SequenceSet $oRange, bool $bExpungeAll = false) : void
	{
		if (!$sFolder || !\count($oRange)) {
			$this->writeLogException(new \ValueError, \LOG_ERR);
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
	 * @throws \ValueError
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
				$oRange = new SequenceSet($iUid);
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
	public function MessageSort(array $aSortTypes, string $sSearchCriterias, bool $bReturnUid = true) : array
	{
		$oSort = new \MailSo\Imap\Requests\SORT($this);
		$oSort->sCriterias = $sSearchCriterias ?: 'ALL';
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
	public function MessageESearch(string $sSearchCriterias, array $aSearchReturn = null, bool $bReturnUid = true, string $sLimit = '') : array
	{
		$oESearch = new \MailSo\Imap\Requests\ESEARCH($this);
		$oESearch->sCriterias = $sSearchCriterias ?: 'ALL';
		$oESearch->aReturn = $aSearchReturn;
		$oESearch->bUid = $bReturnUid;
		$oESearch->sLimit = $sLimit;
//		if (!$this->UTF8 && !\mb_check_encoding($sSearchCriterias, 'UTF-8')) {
		if (!$this->UTF8 && !\MailSo\Base\Utils::IsAscii($sSearchCriterias)) {
			$oESearch->sCharset = 'UTF-8';
		}
		$oESearch->SendRequest();
		return $this->getSimpleESearchOrESortResult($bReturnUid);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageESort(array $aSortTypes, string $sSearchCriterias, array $aSearchReturn = ['ALL'], bool $bReturnUid = true, string $sLimit = '') : array
	{
		$oSort = new \MailSo\Imap\Requests\SORT($this);
		$oSort->sCriterias = $sSearchCriterias ?: 'ALL';
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
	public function MessageSearch(string $sSearchCriterias, bool $bReturnUid = true) : array
	{
		$aRequest = array();
//		if (!$this->UTF8 && !\mb_check_encoding($sSearchCriterias, 'UTF-8')) {
		if (!$this->UTF8 && !\MailSo\Base\Utils::IsAscii($sSearchCriterias)) {
			$aRequest[] = 'CHARSET';
			$aRequest[] = 'UTF-8';
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
	public function MessageThread(string $sSearchCriterias, string $sAlgorithm = '', $bReturnUid = true) : iterable
	{
		$oThread = new \MailSo\Imap\Requests\THREAD($this);
		$oThread->sCriterias = $sSearchCriterias ?: 'ALL';
		$oThread->bUid = $bReturnUid;
		try {
			$sAlgorithm && $oThread->setAlgorithm($sAlgorithm);
		} catch (\Throwable $e) {
			// ignore
		}
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
