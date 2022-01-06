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

use MailSo\Imap\ResponseCollection;
use MailSo\Imap\SequenceSet;
use MailSo\Imap\Enumerations\ResponseType;

/**
 * @category MailSo
 * @package Imap
 */
trait Messages
{
	/**
	 * Appends message to specified folder
	 *
	 * @param resource $rMessageAppendStream
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageAppendStream(string $sFolderName, $rMessageAppendStream, int $iStreamSize, array $aAppendFlags = null, int &$iUid = null, int $iDateTime = 0) : ?int
	{
		$aData = array($this->EscapeFolderName($sFolderName), $aAppendFlags);
		if (0 < $iDateTime) {
			$aData[] = $this->EscapeString(\gmdate('d-M-Y H:i:s', $iDateTime).' +0000');
		}

		$aData[] = '{'.$iStreamSize.'}';

		$this->SendRequestGetResponse('APPEND', $aData);

		$this->writeLog('Write to connection stream', \MailSo\Log\Enumerations\Type::NOTE);

		\MailSo\Base\Utils::MultipleStreamWriter($rMessageAppendStream, array($this->ConnectionResource()));

		$this->sendRaw('');
		$oResponse = $this->getResponse();

		if (null !== $iUid) {
			$oLast = $oResponse->getLast();
			if ($oLast
			 && ResponseType::TAGGED === $oLast->ResponseType
			 && \is_array($oLast->OptionalResponse)
			 && !empty($oLast->OptionalResponse[2])
			 && \is_numeric($oLast->OptionalResponse[2])
			 && 'APPENDUID' === \strtoupper($oLast->OptionalResponse[0])
			) {
				$iUid = (int) $oLast->OptionalResponse[2];
			}
		}

		return $iUid;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageCopy(string $sToFolder, SequenceSet $oRange) : ResponseCollection
	{
		if (!\count($oRange)) {
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $this->SendRequestGetResponse(
			$oRange->UID ? 'UID COPY' : 'COPY',
			array((string) $oRange, $this->EscapeFolderName($sToFolder))
		);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageMove(string $sToFolder, SequenceSet $oRange) : ResponseCollection
	{
		if (!\count($oRange)) {
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if (!$this->IsSupported('MOVE')) {
			$this->writeLogException(
				new Exceptions\RuntimeException('Move is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $this->SendRequestGetResponse(
			$oRange->UID ? 'UID MOVE' : 'MOVE',
			array((string) $oRange, $this->EscapeFolderName($sToFolder))
		);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
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

		return $this->SendRequestGetResponse(
			$oRange->UID ? 'UID STORE' : 'STORE',
			array((string) $oRange, $sStoreAction, $aInputStoreItems)
		);
	}

	/**
	 * See https://tools.ietf.org/html/rfc5256
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleThread(string $sSearchCriterias = 'ALL', bool $bReturnUid = true) : array
	{
		$oThread = new \MailSo\Imap\Requests\THREAD($this);
		$oThread->sCriterias = $sSearchCriterias;
		$oThread->bUid = $bReturnUid;
		return $oThread->SendRequestGetResponse();
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
