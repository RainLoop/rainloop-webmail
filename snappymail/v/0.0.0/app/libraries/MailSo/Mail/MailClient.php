<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mail;

use MailSo\Imap\FolderCollection;
use MailSo\Imap\FolderInformation;
use MailSo\Imap\Enumerations\FetchType;
use MailSo\Imap\Enumerations\MessageFlag;
use MailSo\Imap\Enumerations\StoreAction;
use MailSo\Imap\SequenceSet;
use MailSo\Mime\Enumerations\Header as MimeHeader;
use MailSo\Mime\Enumerations\Parameter as MimeParameter;

/**
 * @category MailSo
 * @package Mail
 */
class MailClient
{
	use \MailSo\Log\Inherit;

	private \MailSo\Imap\ImapClient $oImapClient;

	private bool $bThreadSort = false;

	function __construct()
	{
		$this->oImapClient = new \MailSo\Imap\ImapClient;
	}

	public function ImapClient() : \MailSo\Imap\ImapClient
	{
		return $this->oImapClient;
	}

	private function getEnvelopeOrHeadersRequestString() : string
	{
		if ($this->oImapClient->Settings->message_all_headers) {
			return FetchType::BODY_HEADER_PEEK;
		}

		$aHeaders = array(
//			MimeHeader::RETURN_PATH,
//			MimeHeader::RECEIVED,
//			MimeHeader::MIME_VERSION,
			MimeHeader::MESSAGE_ID,
			MimeHeader::CONTENT_TYPE,
			MimeHeader::FROM_,
			MimeHeader::TO_,
			MimeHeader::CC,
			MimeHeader::BCC,
			MimeHeader::SENDER,
			MimeHeader::REPLY_TO,
			MimeHeader::DELIVERED_TO,
			MimeHeader::IN_REPLY_TO,
			MimeHeader::REFERENCES,
			MimeHeader::DATE,
			MimeHeader::SUBJECT,
			MimeHeader::X_MSMAIL_PRIORITY,
			MimeHeader::IMPORTANCE,
			MimeHeader::X_PRIORITY,
			MimeHeader::X_DRAFT_INFO,
//			MimeHeader::RETURN_RECEIPT_TO,
			MimeHeader::DISPOSITION_NOTIFICATION_TO,
			MimeHeader::X_CONFIRM_READING_TO,
			MimeHeader::AUTHENTICATION_RESULTS,
			MimeHeader::X_DKIM_AUTHENTICATION_RESULTS,
			MimeHeader::LIST_UNSUBSCRIBE,
			// https://autocrypt.org/level1.html#the-autocrypt-header
			MimeHeader::AUTOCRYPT,
			// SPAM
			MimeHeader::X_SPAM_STATUS,
			MimeHeader::X_SPAM_FLAG,
			MimeHeader::X_SPAM_INFO,
			MimeHeader::X_SPAMD_RESULT,
			MimeHeader::X_BOGOSITY,
			// Virus
			MimeHeader::X_VIRUS,
			MimeHeader::X_VIRUS_SCANNED,
			MimeHeader::X_VIRUS_STATUS
		);

		\RainLoop\Api::Actions()->Plugins()->RunHook('imap.message-headers', array(&$aHeaders));

		return FetchType::BuildBodyCustomHeaderRequest($aHeaders, true);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 * @throws \MailSo\Mail\Exceptions\*
	 */
	public function MessageSetFlag(string $sFolderName, SequenceSet $oRange, string $sMessageFlag, bool $bSetAction = true, bool $bSkipUnsupportedFlag = false) : void
	{
		if (\count($oRange)) {
			if ($this->oImapClient->FolderSelect($sFolderName)->IsFlagSupported($sMessageFlag)) {
				$sStoreAction = $bSetAction ? StoreAction::ADD_FLAGS_SILENT : StoreAction::REMOVE_FLAGS_SILENT;
				$this->oImapClient->MessageStoreFlag($oRange, array($sMessageFlag), $sStoreAction);
			} else if (!$bSkipUnsupportedFlag) {
				throw new \MailSo\RuntimeException('Message flag "'.$sMessageFlag.'" is not supported.');
			}
		}
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function Message(string $sFolderName, int $iIndex, bool $bIndexIsUid = true, ?\MailSo\Cache\CacheClient $oCacher = null) : ?Message
	{
		if (1 > $iIndex) {
			throw new \ValueError;
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$oBodyStructure = null;

		$aFetchItems = array(
			FetchType::UID,
//			FetchType::FAST,
			FetchType::RFC822_SIZE,
			FetchType::INTERNALDATE,
			FetchType::FLAGS,
			$this->getEnvelopeOrHeadersRequestString()
		);

		$aFetchResponse = $this->oImapClient->Fetch(array(FetchType::BODYSTRUCTURE), $iIndex, $bIndexIsUid);
		if (\count($aFetchResponse) && isset($aFetchResponse[0])) {
			$oBodyStructure = $aFetchResponse[0]->GetFetchBodyStructure();
			if ($oBodyStructure) {
				$iBodyTextLimit = $this->oImapClient->Settings->body_text_limit;
				foreach ($oBodyStructure->GetHtmlAndPlainParts() as $oPart) {
					$sLine = FetchType::BODY_PEEK.'['.$oPart->PartID().']';
					if (0 < $iBodyTextLimit && $iBodyTextLimit < $oPart->EstimatedSize()) {
						$sLine .= "<0.{$iBodyTextLimit}>";
					}
					$aFetchItems[] = $sLine;
				}
			}
		}

		if (!$oBodyStructure) {
			$aFetchItems[] = FetchType::BODYSTRUCTURE;
		}

		$aFetchResponse = $this->oImapClient->Fetch($aFetchItems, $iIndex, $bIndexIsUid);

		return \count($aFetchResponse)
			? Message::fromFetchResponse($sFolderName, $aFetchResponse[0], $oBodyStructure)
			: null;
	}

	/**
	 * Streams mime part to $mCallback
	 *
	 * @param mixed $mCallback
	 *
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageMimeStream($mCallback, string $sFolderName, int $iIndex, string $sMimeIndex) : bool
	{
		if (!\is_callable($mCallback)) {
			throw new \ValueError;
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$sFileName = '';
		$sContentType = '';
		$sMailEncoding = '';
		$sPeek = FetchType::BODY_PEEK;

		$sMimeIndex = \trim($sMimeIndex);
		$aFetchResponse = $this->oImapClient->Fetch(array(
			\strlen($sMimeIndex)
				? FetchType::BODY_PEEK.'['.$sMimeIndex.'.MIME]'
				: FetchType::BODY_HEADER_PEEK),
			$iIndex, true);

		if (\count($aFetchResponse)) {
			$sMime = $aFetchResponse[0]->GetFetchValue(
				\strlen($sMimeIndex)
					? FetchType::BODY.'['.$sMimeIndex.'.MIME]'
					: FetchType::BODY_HEADER
			);

			if (\strlen($sMime)) {
				$oHeaders = new \MailSo\Mime\HeaderCollection($sMime);

				if (\strlen($sMimeIndex)) {
					$sFileName = $oHeaders->ParameterValue(MimeHeader::CONTENT_DISPOSITION, MimeParameter::FILENAME);
					if (!\strlen($sFileName)) {
						$sFileName = $oHeaders->ParameterValue(MimeHeader::CONTENT_TYPE, MimeParameter::NAME);
					}

					$sMailEncoding = \MailSo\Base\StreamWrappers\Binary::GetInlineDecodeOrEncodeFunctionName(
						$oHeaders->ValueByName(MimeHeader::CONTENT_TRANSFER_ENCODING)
					);

					// RFC 3516
					// Should mailserver decode or PHP?
					if ($sMailEncoding && $this->oImapClient->hasCapability('BINARY')) {
						$sMailEncoding = '';
						$sPeek = FetchType::BINARY_PEEK;
					}

					$sContentType = $oHeaders->ValueByName(MimeHeader::CONTENT_TYPE);
				} else {
					$sFileName = ($oHeaders->ValueByName(MimeHeader::SUBJECT) ?: $iIndex) . '.eml';

					$sContentType = 'message/rfc822';
				}
			}
		}

		$callback = function ($sParent, $sLiteralAtomUpperCase, $rImapLiteralStream)
			use ($mCallback, $sMimeIndex, $sMailEncoding, $sContentType, $sFileName)
			{
				if (\strlen($sLiteralAtomUpperCase) && \is_resource($rImapLiteralStream) && 'FETCH' === $sParent) {
					$mCallback($sMailEncoding
						? \MailSo\Base\StreamWrappers\Binary::CreateStream($rImapLiteralStream, $sMailEncoding)
						: $rImapLiteralStream,
						$sContentType, $sFileName, $sMimeIndex);
				}
			};

		try {
			$aFetchResponse = $this->oImapClient->Fetch(array(
//				FetchType::BINARY_SIZE.'['.$sMimeIndex.']',
				// Push in the aFetchCallbacks array and then called by \MailSo\Imap\Traits\ResponseParser::partialResponseLiteralCallbackCallable
				array(
					$sPeek.'['.$sMimeIndex.']',
					$callback
				)), $iIndex, true);
		} catch (\MailSo\Imap\Exceptions\NegativeResponseException $oException) {
			if (FetchType::BINARY_PEEK === $sPeek && \preg_match('/UNKNOWN-CTE|PARSE/', $oException->getMessage())) {
				$this->logException($oException, \LOG_WARNING);
				$aFetchResponse = $this->oImapClient->Fetch(array(
					array(
						FetchType::BODY_PEEK . '[' . $sMimeIndex . ']',
						$callback
					)), $iIndex, true);
			} else {
				throw $e;
			}
		}

		return ($aFetchResponse && 1 === \count($aFetchResponse));
	}

	public function MessageAppendFile(string $sMessageFileName, string $sFolderToSave, array $aAppendFlags = null) : int
	{
		if (!\is_file($sMessageFileName) || !\is_readable($sMessageFileName)) {
			throw new \ValueError;
		}

		$iMessageStreamSize = \filesize($sMessageFileName);
		$rMessageStream = \fopen($sMessageFileName, 'rb');

		$iUid = $this->oImapClient->MessageAppendStream($sFolderToSave, $rMessageStream, $iMessageStreamSize, $aAppendFlags);

		\fclose($rMessageStream);

		return $iUid;
	}

	/**
	 * Returns list of new messages since $iPrevUidNext
	 * Currently only for INBOX
	 */
	private function getFolderNextMessageInformation(string $sFolderName, int $iPrevUidNext, int $iCurrentUidNext) : array
	{
		$aNewMessages = array();

		if ($this->oImapClient->Settings->fetch_new_messages && $iPrevUidNext && $iPrevUidNext != $iCurrentUidNext && 'INBOX' === $sFolderName) {
			$this->oImapClient->FolderExamine($sFolderName);

			$aFetchResponse = $this->oImapClient->Fetch(array(
				FetchType::UID,
				FetchType::FLAGS,
				FetchType::BuildBodyCustomHeaderRequest(array(
					MimeHeader::FROM_,
					MimeHeader::SUBJECT,
					MimeHeader::CONTENT_TYPE
				))
			), $iPrevUidNext.':*', true);

			foreach ($aFetchResponse as $oFetchResponse) {
				$aFlags = \array_map('strtolower', $oFetchResponse->GetFetchValue(FetchType::FLAGS));

				if (!\in_array(\strtolower(MessageFlag::SEEN), $aFlags)) {
					$iUid = (int) $oFetchResponse->GetFetchValue(FetchType::UID);

					$oHeaders = new \MailSo\Mime\HeaderCollection($oFetchResponse->GetHeaderFieldsValue());

					$sContentTypeCharset = $oHeaders->ParameterValue(MimeHeader::CONTENT_TYPE, MimeParameter::CHARSET);

					if ($sContentTypeCharset) {
						$oHeaders->SetParentCharset($sContentTypeCharset);
					}

					$aNewMessages[] = array(
						'folder' => $sFolderName,
						'uid' => $iUid,
						'subject' => $oHeaders->ValueByName(MimeHeader::SUBJECT, !$sContentTypeCharset),
						'from' => $oHeaders->GetAsEmailCollection(MimeHeader::FROM_)
					);
				}
			}
		}

		return $aNewMessages;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderInformation(string $sFolderName, int $iPrevUidNext = 0, SequenceSet $oRange = null) : array
	{
		if ($oRange) {
//			$aInfo = $this->oImapClient->FolderExamine($sFolderName)->jsonSerialize();
			$aInfo = $this->oImapClient->FolderStatusAndSelect($sFolderName)->jsonSerialize();
			$aInfo['messagesFlags'] = array();
			if (\count($oRange)) {
				$aFetchResponse = $this->oImapClient->Fetch(array(
					FetchType::UID,
					FetchType::FLAGS
				), (string) $oRange, $oRange->UID);
				foreach ($aFetchResponse as $oFetchResponse) {
					$iUid = (int) $oFetchResponse->GetFetchValue(FetchType::UID);
					$aLowerFlags = \array_map('mb_strtolower', \array_map('\\MailSo\\Base\\Utils::Utf7ModifiedToUtf8', $oFetchResponse->GetFetchValue(FetchType::FLAGS)));
					$aInfo['messagesFlags'][] = array(
						'uid' => $iUid,
						'flags' => $aLowerFlags
					);
				}
			}
		} else {
			$aInfo = $this->oImapClient->FolderStatus($sFolderName)->jsonSerialize();
		}

		if ($iPrevUidNext) {
			$aInfo['newMessages'] = $this->getFolderNextMessageInformation(
				$sFolderName,
				$iPrevUidNext,
				\intval($aInfo['uidNext'])
			);
		}

//		$aInfo['appendLimit'] = $aInfo['appendLimit'] ?: $this->oImapClient->AppendLimit();
		return $aInfo;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderHash(string $sFolderName) : string
	{
		try
		{
//			return $this->oImapClient->FolderStatusAndSelect($sFolderName)->etag;
			return $this->oImapClient->FolderStatus($sFolderName)->etag;
		}
		catch (\Throwable $oException)
		{
			\SnappyMail\Log::warning('IMAP', "FolderHash({$sFolderName}) Exception: {$oException->getMessage()}");
		}
		return '';
	}

	public function MessageThread(string $sFolderName, string $sMessageID) : MessageCollection
	{
		$this->oImapClient->FolderExamine($sFolderName);

		$sMessageID = \MailSo\Imap\SearchCriterias::escapeSearchString($this->oImapClient, $sMessageID);
		$sSearch = "OR HEADER Message-ID {$sMessageID} HEADER References {$sMessageID}";
		$aResult = [];
		try
		{
			foreach ($this->oImapClient->MessageThread($sSearch) as $mItem) {
				// Flatten to single level
				\array_walk_recursive($mItem, fn($a) => $aResult[] = $a);
			}
		}
		catch (\MailSo\RuntimeException $oException)
		{
			\SnappyMail\Log::warning('MailClient', 'MessageThread ' . $oException->getMessage());
			unset($oException);
		}
//		$this->logWrite('MessageThreadList: '.\print_r($threads, 1));
		return $aResult;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	protected function ThreadsMap(string $sAlgorithm, MessageCollection $oMessageCollection, ?\MailSo\Cache\CacheClient $oCacher, bool $bBackground = false) : array
	{
		$oFolderInfo = $oMessageCollection->FolderInfo;
		$sFolderName = $oFolderInfo->FullName;

		$sSearch = 'ALL';
//		$sSearch = 'UNDELETED';
/*
		$iThreadLimit = $this->oImapClient->Settings->thread_limit;
		if ($iThreadLimit && $iThreadLimit < $oFolderInfo->MESSAGES) {
			$sSearch = ($oFolderInfo->MESSAGES - $iThreadLimit) . ':*';
		}
*/
/*
		$sAlgorithm = '';
		if ($this->oImapClient->hasCapability('THREAD=REFS')) {
			$sAlgorithm = 'REFS';
		} else if ($this->oImapClient->hasCapability('THREAD=REFERENCES')) {
			$sAlgorithm = 'REFERENCES';
		} else if ($this->oImapClient->hasCapability('THREAD=ORDEREDSUBJECT')) {
			$sAlgorithm = 'ORDEREDSUBJECT';
		}
*/
		$sSerializedHashKey = null;
		if ($oCacher && $oCacher->IsInited()) {
			$sSerializedHashKey = "ThreadsMap/{$sAlgorithm}/{$sSearch}/{$oFolderInfo->etag}";
//			$sSerializedHashKey = "ThreadsMap/{$sAlgorithm}/{$sSearch}/{$iThreadLimit}/{$oFolderInfo->etag}";

			$sSerializedUids = $oCacher->Get($sSerializedHashKey);
			if (!empty($sSerializedUids)) {
				$aSerializedUids = \json_decode($sSerializedUids, true);
				if (isset($aSerializedUids['ThreadsUids']) && \is_array($aSerializedUids['ThreadsUids'])) {
					$oMessageCollection->totalThreads = \count($aSerializedUids['ThreadsUids']);
					$this->logWrite('Get Threads from cache ("'.$sFolderName.'" / '.$sSearch.') [count:'.\count($aSerializedUids['ThreadsUids']).']');
					return $aSerializedUids['ThreadsUids'];
				}
			}
/*
			// Idea to fetch all UID's in background
			else if (!$bBackground) {
				$this->logWrite('Set ThreadsMap() as background task ("'.$sFolderName.'" / '.$sSearch.')');
				\SnappyMail\Shutdown::add(function($oMailClient, $oFolderInfo, $oCacher) {
					$oFolderInfo->MESSAGES = 0;
					$oMailClient->ThreadsMap($sAlgorithm, $oMessageCollection, $oCacher, true);
				}, [$this, $oFolderInfo, $oCacher]);
				return [];
			}
*/
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aResult = array();
		try
		{
			foreach ($this->oImapClient->MessageThread($sSearch, $sAlgorithm) as $mItem) {
				// Flatten to single level
				$aMap = [];
				\array_walk_recursive($mItem, function($a) use (&$aMap) { $aMap[] = $a; });
				$aResult[] = $aMap;
			}
		}
		catch (\MailSo\RuntimeException $oException)
		{
			\SnappyMail\Log::warning('MailClient', 'ThreadsMap ' . $oException->getMessage());
			unset($oException);
		}

		if ($sSerializedHashKey) {
			$oCacher->Set($sSerializedHashKey, \json_encode(array('ThreadsUids' => $aResult)));
			$this->logWrite('Save Threads to cache ("'.$sFolderName.'" / '.$sSearch.') [count:'.\count($aResult).']');
		}

		$oMessageCollection->totalThreads = \count($aResult);
		return $aResult;
	}

	// All threads UID's except the most recent UID of each thread
	protected function ThreadsOldUids(array $aAllThreads, MessageCollection $oMessageCollection, ?\MailSo\Cache\CacheClient $oCacher, bool $bBackground = false) : array
	{
		$oFolderInfo = $oMessageCollection->FolderInfo;

		$bThreadSort = $this->bThreadSort && $this->oImapClient->hasCapability('SORT');

		$sSerializedHashKey = null;
		if ($oCacher && $oCacher->IsInited()) {
			$sSerializedHashKey = "ThreadsOldUids/{$oFolderInfo->etag}/" . ($bThreadSort ? 'S' : 'N');
			$sSerializedUids = $oCacher->Get($sSerializedHashKey);
			if (!empty($sSerializedUids)) {
				$aSerializedUids = \json_decode($sSerializedUids, true);
				if (isset($aSerializedUids['ThreadsUids']) && \is_array($aSerializedUids['ThreadsUids'])) {
					$this->logWrite('Get old Threads UIDs from cache ("'.$oFolderInfo->FullName.'") [count:'.\count($aSerializedUids['ThreadsUids']).']');
					return $aSerializedUids['ThreadsUids'];
				}
			}
		}

		$aUids = [];

		if ($bThreadSort) {
			$oParams = new MessageListParams;
			$oParams->sFolderName = $oFolderInfo->FullName;
			$oParams->sSort = 'DATE';
			$oParams->bUseSort = true;
			$oParams->bHideDeleted = false;
			foreach ($aAllThreads as $aThreadUIDs) {
				$oParams->oSequenceSet = new \MailSo\Imap\SequenceSet($aThreadUIDs);
				$aThreadUIDs = $this->GetUids($oParams, $oFolderInfo);
				if ($aThreadUIDs) {
					// Remove the most recent UID
					\array_pop($aThreadUIDs);
					$aUids = \array_merge($aUids, $aThreadUIDs);
				}
			}
/*
			// Idea to use one SORT for all threads instead of per thread
			$aSortUids = \array_reduce($aAllThreads, 'array_merge', []);
			$oParams->oSequenceSet = new \MailSo\Imap\SequenceSet($aSortUids);
			$aSortUids = $this->GetUids($oParams, $oFolderInfo);
			foreach ($aAllThreads as $aThreadUIDs) {
				$aThreadUIDs = \array_intersect($aSortUids, $aThreadUIDs);
				// Remove the most recent UID
				\array_pop($aThreadUIDs);
				$aUids = \array_merge($aUids, $aThreadUIDs);
			}
*/
		} else {
			// Not the best solution to remove the most recent UID,
			// as older messages could have a higher UID
			foreach ($aAllThreads as $aThreadUIDs) {
				unset($aThreadUIDs[\array_search(\max($aThreadUIDs), $aThreadUIDs)]);
				$aUids = \array_merge($aUids, $aThreadUIDs);
			}
		}

		if ($sSerializedHashKey) {
			$oCacher->Set($sSerializedHashKey, \json_encode(array('ThreadsUids' => $aUids)));
			$this->logWrite('Save old Threads UIDs to cache ("'.$oFolderInfo->FullName.'") [count:'.\count($aUids).']');
		}

		return $aUids;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	protected function MessageListByRequestIndexOrUids(MessageCollection $oMessageCollection, SequenceSet $oRange,
		array &$aAllThreads = [], array &$aUnseenUIDs = []) : void
	{
		if (\count($oRange)) {
			$aFetchItems = array(
				FetchType::UID,
				FetchType::RFC822_SIZE,
				FetchType::INTERNALDATE,
				FetchType::FLAGS,
				FetchType::BODYSTRUCTURE
			);
			if ($this->oImapClient->hasCapability('PREVIEW')) {
				$aFetchItems[] = FetchType::PREVIEW; // . ' (LAZY)';
			}
			$aFetchItems[] = $this->getEnvelopeOrHeadersRequestString();
			$aFetchIterator = $this->oImapClient->FetchIterate($aFetchItems, (string) $oRange, $oRange->UID);
			// FETCH does not respond in the id order of the SequenceSet, so we prefill $aCollection for the right sort order.
			$aCollection = \array_fill_keys($oRange->getArrayCopy(), null);
			foreach ($aFetchIterator as $oFetchResponse) {
				$id = $oRange->UID
					? $oFetchResponse->GetFetchValue(FetchType::UID)
					: $oFetchResponse->oImapResponse->ResponseList[1];
				$oMessage = Message::fromFetchResponse($oMessageCollection->FolderName, $oFetchResponse);
				if ($oMessage) {
					if ($aAllThreads) {
						$iUid = $oMessage->Uid;
						// Find thread and set it.
						// Used by GUI to delete/move the whole thread or other features
						foreach ($aAllThreads as $aMap) {
							if (\in_array($iUid, $aMap)) {
								$oMessage->SetThreads($aMap);
								$oMessage->SetThreadUnseen(\array_values(\array_intersect($aUnseenUIDs, $aMap)));
								break;
							}
						}
					}
					$aCollection[$id] = $oMessage;
				}
			}
			$oMessageCollection->exchangeArray(\array_values(\array_filter($aCollection)));
		}
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	private function GetUids(MessageListParams $oParams, FolderInformation $oInfo, bool $onlyCache = false) : array
	{
		$oCacher = $oParams->oCacher;
		$sFolderName = $oParams->sFolderName;

		$bUseSort = $oParams->bUseSort && $this->oImapClient->hasCapability('SORT');
		$aSortTypes = [];
		if ($bUseSort) {
			if ($oParams->sSort) {
				// TODO: $oParams->sortValid($this->oImapClient);
				$aSortTypes[] = $oParams->sSort;
			}
			if (!\str_contains($oParams->sSort, 'DATE')) {
				// Always also sort DATE descending when DATE is not defined
				$aSortTypes[] = 'REVERSE DATE';
			}
		}
		$oParams->sSort = \implode(' ', $aSortTypes);

		$bUseCache = $oCacher && $oCacher->IsInited();
		$oSearchCriterias = \MailSo\Imap\SearchCriterias::fromString(
			$this->oImapClient,
			$sFolderName,
			$oParams->sSearch,
			$oParams->bHideDeleted,
			$bUseCache
		);
		// Disable? as there are many cases that change the result
//		$bUseCache = false;

		$bReturnUid = true;
		if ($oParams->oSequenceSet) {
			$bReturnUid = $oParams->oSequenceSet->UID;
			$oSearchCriterias->prepend(($bReturnUid ? 'UID ' : '') . $oParams->oSequenceSet);
		}

/*
		$oSearchCriterias->fuzzy = $oParams->bSearchFuzzy && $this->oImapClient->hasCapability('SEARCH=FUZZY');
*/
		$sSerializedHash = '';
		$sSerializedLog = '';
		if ($bUseCache && $oInfo->etag) {
			$sSerializedHash = 'Get'
				. ($bReturnUid ? 'UIDS/' : 'IDS/')
				. "{$oParams->sSort}/{$this->oImapClient->Hash()}/{$sFolderName}/{$oSearchCriterias}";
			$sSerializedLog = "\"{$sFolderName}\" / {$oParams->sSort} / {$oSearchCriterias}";
			$sSerialized = $oCacher->Get($sSerializedHash);
			if (!empty($sSerialized)) {
				$aSerialized = \json_decode($sSerialized, true);
				if (\is_array($aSerialized)
				 && isset($aSerialized['FolderHash'], $aSerialized['Uids'])
				 && $oInfo->etag === $aSerialized['FolderHash']
				 && \is_array($aSerialized['Uids'])
				) {
					$this->logWrite('Get Serialized '.($bReturnUid?'UIDS':'IDS').' from cache ('.$sSerializedLog.') [count:'.\count($aSerialized['Uids']).']');
					return $aSerialized['Uids'];
				}
			}
		}
		if ($onlyCache) {
			return [];
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aResultUids = [];
		if ($bUseSort) {
//			$this->oImapClient->hasCapability('ESORT')
//			$aResultUids = $this->oImapClient->MessageESort($aSortTypes, $oSearchCriterias)['ALL'];
			$aResultUids = $this->oImapClient->MessageSort($aSortTypes, $oSearchCriterias, $bReturnUid);
		} else {
//			$this->oImapClient->hasCapability('ESEARCH')
//			$aResultUids = $this->oImapClient->MessageESearch($oSearchCriterias, null, $bReturnUid)
			$aResultUids = $this->oImapClient->MessageSearch($oSearchCriterias,        $bReturnUid);
		}

		if ($bUseCache) {
			$oCacher->Set($sSerializedHash, \json_encode(array(
				'FolderHash' => $oInfo->etag,
				'Uids' => $aResultUids
			)));

			$this->logWrite('Save Serialized '.($bReturnUid?'UIDS':'IDS').' to cache ('.$sSerializedLog.') [count:'.\count($aResultUids).']');
		}

//		$oSequenceSet = new SequenceSet($aResultUids, false);
//		$oSequenceSet->UID = $bReturnUid;
//		return $oSequenceSet;

		return $aResultUids;
	}

	public function MessageListUnseen(MessageListParams $oParams, FolderInformation $oInfo) : array
	{
		$oUnseenParams = new MessageListParams;
		$oUnseenParams->sFolderName = $oParams->sFolderName;
		$oUnseenParams->sSearch = 'unseen';
//		$oUnseenParams->sSort = $oParams->sSort;
		$oUnseenParams->oCacher = $oParams->oCacher;
		$oUnseenParams->bUseSort = false; // $oParams->bUseSort
		$oUnseenParams->bUseThreads = false; // $oParams->bUseThreads;
		$oUnseenParams->bHideDeleted = $oParams->bHideDeleted;
//		$oUnseenParams->iOffset = $oParams->iOffset;
//		$oUnseenParams->iLimit = $oParams->iLimit;
//		$oUnseenParams->iPrevUidNext = $oParams->iPrevUidNext;
//		$oUnseenParams->iThreadUid = $oParams->iThreadUid;
		return $this->GetUids($oUnseenParams, $oInfo);
	}

	/**
	 * Runs SORT/SEARCH when $sSearch is provided
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageList(MessageListParams $oParams) : MessageCollection
	{
		if (0 > $oParams->iOffset || 0 > $oParams->iLimit || 999 < $oParams->iLimit) {
			throw new \ValueError;
		}

		$sSearch = \trim($oParams->sSearch);

		$oMessageCollection = new MessageCollection;
		$oMessageCollection->FolderName = $oParams->sFolderName;
		$oMessageCollection->Offset = $oParams->iOffset;
		$oMessageCollection->Limit = $oParams->iLimit;
		$oMessageCollection->Search = $sSearch;
		$oMessageCollection->ThreadUid = $oParams->iThreadUid;
//		$oMessageCollection->Filtered = '' !== $this->oImapClient->Settings->search_filter;

		$oInfo = $this->oImapClient->FolderStatusAndSelect($oParams->sFolderName);
		$oMessageCollection->FolderInfo = $oInfo;
		$oMessageCollection->totalEmails = $oInfo->MESSAGES;

		$oParams->bUseThreads = $oParams->bUseThreads && $this->oImapClient->CapabilityValue('THREAD');
//			&& ($this->oImapClient->hasCapability('THREAD=REFS') || $this->oImapClient->hasCapability('THREAD=REFERENCES') || $this->oImapClient->hasCapability('THREAD=ORDEREDSUBJECT'));
		if ($oParams->iThreadUid && !$oParams->bUseThreads) {
			throw new \ValueError('THREAD not supported');
		}

		if (!$oInfo->MESSAGES || $oParams->iOffset > $oInfo->MESSAGES) {
			return $oMessageCollection;
		}

		if (!$oParams->iThreadUid) {
			$oMessageCollection->NewMessages = $this->getFolderNextMessageInformation(
				$oParams->sFolderName, $oParams->iPrevUidNext, $oInfo->UIDNEXT
			);
		}

		$bUseSort = ($oParams->bUseSort || $oParams->sSort) && $this->oImapClient->hasCapability('SORT');
		$oParams->bUseSort = $bUseSort;
		$oParams->sSearch = $sSearch;

		$aAllThreads = [];
		$aUnseenUIDs = [];
		$aUids = [];

		$message_list_limit = $this->oImapClient->Settings->message_list_limit;
		if (100 > $message_list_limit || $message_list_limit > $oInfo->MESSAGES) {
			$message_list_limit = 0;
		}

		// Idea to fetch all UID's in background
		$oAllParams = clone $oParams;
		$oAllParams->sSearch = '';
		$oAllParams->oSequenceSet = null;
		if ($message_list_limit && !$oParams->iThreadUid && $oParams->oCacher && $oParams->oCacher->IsInited()) {
			$aUids = $this->GetUids($oAllParams, $oInfo, true);
			if ($aUids) {
				$message_list_limit = 0;
				$oMessageCollection->Sort = $oAllParams->sSort;
			} else {
				\SnappyMail\Shutdown::add(function($oMailClient, $oAllParams, $oInfo, $oMessageCollection) {
					$oMailClient->GetUids($oAllParams, $oInfo);
					if ($oAllParams->bUseThreads) {
						$oMailClient->ThreadsMap($oAllParams->sThreadAlgorithm, $oMessageCollection, $oAllParams->oCacher, true);
					}
				}, [$this, $oAllParams, $oInfo, $oMessageCollection]);
			}
		}

		if ($message_list_limit && !$aUids) {
//		if ($message_list_limit || (!$this->oImapClient->hasCapability('SORT') && !$this->oImapClient->CapabilityValue('THREAD'))) {
			// Don't use THREAD for speed
			$oMessageCollection->Limited = true;
			$this->logWrite('List optimization (count: '.$oInfo->MESSAGES.', limit:'.$message_list_limit.')');
			if (\strlen($sSearch)) {
				// Don't use SORT for speed
				$oParams->bUseSort = false;
				$aUids = $this->GetUids($oParams, $oInfo);
			} else {
				if ($bUseSort) {
					// Attempt to sort REVERSE DATE with a bigger range then $oParams->iLimit
					$end = \min($oInfo->MESSAGES, \max(1, $oInfo->MESSAGES - $oParams->iOffset + $oParams->iLimit));
					$start = \max(1, $end - ($oParams->iLimit * 3) + 1);
					$oParams->oSequenceSet = new SequenceSet(\range($end, $start), false);
					$aRequestIndexes = $this->GetUids($oParams, $oInfo);
					// Attempt to get the correct $oParams->iLimit slice
					$aRequestIndexes = \array_slice($aRequestIndexes, $oParams->iOffset ? $oParams->iLimit : 0, $oParams->iLimit);
				} else {
					// Fetch ID's from high to low
					$end = \max(1, $oInfo->MESSAGES - $oParams->iOffset);
					$start = \max(1, $end - $oParams->iLimit + 1);
					$aRequestIndexes = \range($end, $start);
				}
				$this->MessageListByRequestIndexOrUids($oMessageCollection, new SequenceSet($aRequestIndexes, false));
			}
			$oMessageCollection->Sort = $oParams->sSort;
		} else {
			if ($oParams->bUseThreads && $oParams->iThreadUid) {
				$aUids = [$oParams->iThreadUid];
			} else if (!$aUids) {
				$aUids = $this->GetUids($oAllParams, $oInfo);
				$oMessageCollection->Sort = $oAllParams->sSort;
			}

			if ($oParams->bUseThreads) {
				$aAllThreads = $this->ThreadsMap($oParams->sThreadAlgorithm, $oMessageCollection, $oParams->oCacher);
//				$iThreadLimit = $this->oImapClient->Settings->thread_limit;
				if ($oParams->iThreadUid) {
					// Only show the selected thread messages
					foreach ($aAllThreads as $aMap) {
						if (\in_array($oParams->iThreadUid, $aMap)) {
							$aUids = $aMap;
							break;
						}
					}
					$aAllThreads = [$aUids];
					// This only speeds up the search when not cached
//					$oParams->oSequenceSet = new SequenceSet($aUids);
				} else {
					// Remove all threaded UID's except the most recent of each thread
					$aUids = \array_diff($aUids, $this->ThreadsOldUids($aAllThreads, $oMessageCollection, $oParams->oCacher));
					// Get all unseen
					$aUnseenUIDs = $this->MessageListUnseen($oParams, $oInfo);
				}
			}

			if ($aUids && \strlen($sSearch)) {
				$oParams->bUseSort = false;
				$aSearchedUids = $this->GetUids($oParams, $oInfo);
				if ($oParams->bUseThreads && !$oParams->iThreadUid) {
					$matchingThreadUids = [];
					foreach ($aAllThreads as $aMap) {
						if (\array_intersect($aSearchedUids, $aMap)) {
							$matchingThreadUids = \array_merge($matchingThreadUids, $aMap);
						}
					}
					$aUids = \array_filter($aUids, function($iUid) use ($aSearchedUids, $matchingThreadUids) {
						return \in_array($iUid, $aSearchedUids) || \in_array($iUid, $matchingThreadUids);
					});
				} else {
					$aUids = \array_filter($aUids, function($iUid) use ($aSearchedUids) {
						return \in_array($iUid, $aSearchedUids);
					});
				}
			}
		}

		if (\count($aUids)) {
			$oMessageCollection->totalEmails = \count($aUids);
			$aUids = \array_slice($aUids, $oParams->iOffset, $oParams->iLimit);
			$this->MessageListByRequestIndexOrUids($oMessageCollection, new SequenceSet($aUids), $aAllThreads, $aUnseenUIDs);
		}

		return $oMessageCollection;
	}

	public function FindMessageUidByMessageId(string $sFolderName, string $sMessageId) : ?int
	{
		if (!\strlen($sMessageId)) {
			throw new \ValueError;
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aUids = $this->oImapClient->MessageSearch('HEADER Message-ID '.$sMessageId);

		return 1 === \count($aUids) && \is_numeric($aUids[0]) ? (int) $aUids[0] : null;
	}

	public function Folders(string $sParent, string $sListPattern, bool $bUseListSubscribeStatus) : ?FolderCollection
	{
		$oFolderCollection = $this->oImapClient->FolderStatusList($sParent, $sListPattern);
		if (!$oFolderCollection->count()) {
			return null;
		}

		if ($bUseListSubscribeStatus && !$this->oImapClient->hasCapability('LIST-EXTENDED')) {
//			$this->logWrite('RFC5258 not supported, using LSUB');
//			\SnappyMail\Log::warning('IMAP', 'RFC5258 not supported, using LSUB');
			try
			{
				$oSubscribedFolders = $this->oImapClient->FolderSubscribeList($sParent, $sListPattern);
				foreach ($oSubscribedFolders as /* @var $oImapFolder \MailSo\Imap\Folder */ $oImapFolder) {
					isset($oFolderCollection[$oImapFolder->FullName])
					&& $oFolderCollection[$oImapFolder->FullName]->setSubscribed();
				}
			}
			catch (\Throwable $oException)
			{
				\SnappyMail\Log::error('IMAP', 'FolderSubscribeList: ' . $oException->getMessage());
				foreach ($oFolderCollection as /* @var $oImapFolder \MailSo\Imap\Folder */ $oImapFolder) {
					$oImapFolder->setSubscribed();
				}
			}
		}

		return $oFolderCollection;
	}

	/**
	 * @throws \ValueError
	 */
	public function FolderCreate(string $sFolderNameInUtf8, string $sFolderParentFullName = '', bool $bSubscribeOnCreation = true, string $sDelimiter = '') : ?\MailSo\Imap\Folder
	{
		$sFolderNameInUtf8 = \trim($sFolderNameInUtf8);
		$sFolderParentFullName = \trim($sFolderParentFullName);

		if (!\strlen($sFolderNameInUtf8)) {
			throw new \ValueError;
		}

		if (!\strlen($sDelimiter) || \strlen($sFolderParentFullName)) {
			$sDelimiter = $this->oImapClient->FolderHierarchyDelimiter($sFolderParentFullName);
			if (null === $sDelimiter) {
				// TODO: Translate
				throw new \MailSo\RuntimeException(
					\strlen($sFolderParentFullName)
						? 'Cannot create folder in non-existent parent folder.'
						: 'Cannot get folder delimiter.');
			}

			if (\strlen($sDelimiter) && \strlen($sFolderParentFullName)) {
				$sFolderParentFullName .= $sDelimiter;
			}
		}

/*		// Allow non existent parent folders
		if (\strlen($sDelimiter) && false !== \strpos($sFolderNameInUtf8, $sDelimiter)) {
			// TODO: Translate
			throw new \MailSo\RuntimeException('New folder name contains delimiter.');
		}
*/
		$sFullNameToCreate = $sFolderParentFullName.$sFolderNameInUtf8;

		$this->oImapClient->FolderCreate($sFullNameToCreate, $bSubscribeOnCreation);

		$aFolders = $this->oImapClient->FolderStatusList($sFullNameToCreate, '');
		if (isset($aFolders[$sFullNameToCreate])) {
			$oImapFolder = $aFolders[$sFullNameToCreate];
			$bSubscribeOnCreation && $oImapFolder->setSubscribed();
			return $oImapFolder;
		}

		return null;
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function FolderRename(string $sPrevFolderFullName, string $sNewFolderFullName) : self
	{
		if (!\strlen($sPrevFolderFullName) || !\strlen($sNewFolderFullName)) {
			throw new \ValueError;
		}

		if (!$this->oImapClient->FolderHierarchyDelimiter($sPrevFolderFullName)) {
			// TODO: Translate
			throw new \MailSo\RuntimeException('Cannot rename non-existent folder.');
		}
/*
		if (\strlen($sDelimiter) && false !== \strpos($sNewFolderFullName, $sDelimiter)) {
			// TODO: Translate
			throw new \MailSo\RuntimeException('New folder name contains delimiter.');
		}
*/

		/**
		 * https://datatracker.ietf.org/doc/html/rfc3501#section-6.3.5
		 *   Does not mention subscriptions
		 * https://datatracker.ietf.org/doc/html/rfc9051#section-6.3.6
		 *   Mentions that a server doesn't automatically manage subscriptions
		 */
		$oSubscribedFolders = $this->oImapClient->FolderSubscribeList($sPrevFolderFullName, '*');

		$this->oImapClient->FolderRename($sPrevFolderFullName, $sNewFolderFullName);

		foreach ($oSubscribedFolders as /* @var $oFolder \MailSo\Imap\Folder */ $oFolder) {
			$sFolderFullNameForResubscribe = $oFolder->FullName;
			if (\str_starts_with($sFolderFullNameForResubscribe, $sPrevFolderFullName)) {
				$this->oImapClient->FolderUnsubscribe($sFolderFullNameForResubscribe);
				$this->oImapClient->FolderSubscribe(
					$sNewFolderFullName . \substr($sFolderFullNameForResubscribe, \strlen($sPrevFolderFullName))
				);
			}
		}

		return $this;
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function SetLogger(?\MailSo\Log\Logger $oLogger) : void
	{
		$this->oLogger = $oLogger;
		$this->oImapClient->SetLogger($oLogger);
	}

	public function __call(string $name, array $arguments) /*: mixed*/
	{
		return $this->oImapClient->{$name}(...$arguments);
	}
}
