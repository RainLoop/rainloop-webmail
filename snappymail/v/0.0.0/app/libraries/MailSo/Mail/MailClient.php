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
	private ?\MailSo\Log\Logger $oLogger = null;

	private \MailSo\Imap\ImapClient $oImapClient;

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

		return FetchType::BuildBodyCustomHeaderRequest(array(
			MimeHeader::RETURN_PATH,
			MimeHeader::RECEIVED,
			MimeHeader::MIME_VERSION,
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
			MimeHeader::RETURN_RECEIPT_TO,
			MimeHeader::DISPOSITION_NOTIFICATION_TO,
			MimeHeader::X_CONFIRM_READING_TO,
			MimeHeader::AUTHENTICATION_RESULTS,
			MimeHeader::X_DKIM_AUTHENTICATION_RESULTS,
			MimeHeader::LIST_UNSUBSCRIBE,
			// https://autocrypt.org/level1.html#the-autocrypt-header
			MimeHeader::AUTOCRYPT,
			// SPAM
			MimeHeader::X_SPAM_STATUS,
//			MimeHeader::X_SPAM_FLAG,
			MimeHeader::X_SPAMD_RESULT,
			MimeHeader::X_BOGOSITY,
			// Virus
			MimeHeader::X_VIRUS,
			MimeHeader::X_VIRUS_SCANNED,
			MimeHeader::X_VIRUS_STATUS
		), true);
//
//		return FetchType::ENVELOPE;
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
			throw new \InvalidArgumentException;
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$oBodyStructure = null;
		$oMessage = null;

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
/*
				$gSignatureParts = $oBodyStructure->SearchByContentType('multipart/signed');
				foreach ($gSignatureParts as $oPart) {
					if ($oPart->IsPgpSigned()) {
						// An empty section specification refers to the entire message, including the header.
						// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
						$aFetchItems[] = FetchType::BODY_PEEK.'['.$oPart->SubParts()[0]->PartID().'.MIME]';
						$aFetchItems[] = FetchType::BODY_PEEK.'['.$oPart->SubParts()[0]->PartID().']';
						$aFetchItems[] = FetchType::BODY_PEEK.'['.$oPart->SubParts()[1]->PartID().']';
					}
				}
*/
			}
		}

		if (!$oBodyStructure) {
			$aFetchItems[] = FetchType::BODYSTRUCTURE;
		}

		$aFetchResponse = $this->oImapClient->Fetch($aFetchItems, $iIndex, $bIndexIsUid);
		if (\count($aFetchResponse)) {
			$oMessage = Message::fromFetchResponse($sFolderName, $aFetchResponse[0], $oBodyStructure);
		}

		return $oMessage;
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
			throw new \InvalidArgumentException;
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

		$aFetchResponse = $this->oImapClient->Fetch(array(
//			FetchType::BINARY_SIZE.'['.$sMimeIndex.']',
			// Push in the aFetchCallbacks array and then called by \MailSo\Imap\Traits\ResponseParser::partialResponseLiteralCallbackCallable
			array(
				$sPeek.'['.$sMimeIndex.']',
				function ($sParent, $sLiteralAtomUpperCase, $rImapLiteralStream) use ($mCallback, $sMimeIndex, $sMailEncoding, $sContentType, $sFileName)
				{
					if (\strlen($sLiteralAtomUpperCase) && \is_resource($rImapLiteralStream) && 'FETCH' === $sParent) {
						$mCallback($sMailEncoding
							? \MailSo\Base\StreamWrappers\Binary::CreateStream($rImapLiteralStream, $sMailEncoding)
							: $rImapLiteralStream,
							$sContentType, $sFileName, $sMimeIndex);
					}
				}
			)), $iIndex, true);

		return ($aFetchResponse && 1 === \count($aFetchResponse));
	}

	public function MessageAppendFile(string $sMessageFileName, string $sFolderToSave, array $aAppendFlags = null) : int
	{
		if (!\is_file($sMessageFileName) || !\is_readable($sMessageFileName)) {
			throw new \InvalidArgumentException;
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

			foreach ($aFetchResponse as /* @var $oFetchResponse \MailSo\Imap\FetchResponse */ $oFetchResponse) {
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
						'from' => $oHeaders->GetAsEmailCollection(MimeHeader::FROM_, !$sContentTypeCharset)
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
		return $this->oImapClient->FolderStatus($sFolderName)->etag;
//		return $this->oImapClient->FolderStatusAndSelect($sFolderName)->etag;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	protected function MessageListThreadsMap(MessageCollection $oMessageCollection, ?\MailSo\Cache\CacheClient $oCacher) : array
	{
		$sFolderName = $oMessageCollection->FolderName;

		$sSearch = 'ALL';
/*
		$iThreadLimit = $this->oImapClient->Settings->thread_limit;
		if ($iThreadLimit && $iThreadLimit < $oMessageCollection->FolderInfo->MESSAGES) {
			$sSearch = ($oMessageCollection->FolderInfo->MESSAGES - $iThreadLimit) . ':*';
		}
*/

		$sSerializedHashKey = null;
		if ($oCacher && $oCacher->IsInited()) {
			$sSerializedHashKey =
				"ThreadsMapSorted/{$sSearch}/{$sFolderName}/{$oMessageCollection->FolderInfo->etag}";
//				"ThreadsMapSorted/{$sSearch}/{$iThreadLimit}/{$sFolderName}/{$oMessageCollection->FolderInfo->etag}";

			if ($this->oLogger) {
				$this->oLogger->Write($sSerializedHashKey);
			}

			$sSerializedUids = $oCacher->Get($sSerializedHashKey);
			if (!empty($sSerializedUids)) {
				$aSerializedUids = \json_decode($sSerializedUids, true);
				if (isset($aSerializedUids['ThreadsUids']) && \is_array($aSerializedUids['ThreadsUids'])) {
					if ($this->oLogger) {
						$this->oLogger->Write('Get Serialized Thread UIDS from cache ("'.$sFolderName.'" / '.$sSearch.') [count:'.\count($aSerializedUids['ThreadsUids']).']');
					}
					return $aSerializedUids['ThreadsUids'];
				}
			}
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aResult = array();
		try
		{
			foreach ($this->oImapClient->MessageSimpleThread($sSearch) as $mItem) {
				// Flatten to single level
				$aMap = [];
				\array_walk_recursive($mItem, function($a) use (&$aMap) { $aMap[] = $a; });
				$aResult[] = $aMap;
			}
		}
		catch (\MailSo\RuntimeException $oException)
		{
			\SnappyMail\Log::warning('MailClient', 'MessageListThreadsMap ' . $oException->getMessage());
			unset($oException);
		}

		if (!empty($sSerializedHashKey)) {
			$oCacher->Set($sSerializedHashKey, \json_encode(array(
				'ThreadsUids' => $aResult
			)));

			if ($this->oLogger) {
				$this->oLogger->Write('Save Serialized Thread UIDS to cache ("'.$sFolderName.'" / '.$sSearch.') [count:'.\count($aResult).']');
			}
		}

		return $aResult;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	protected function MessageListByRequestIndexOrUids(MessageCollection $oMessageCollection, SequenceSet $oRange, array &$aAllThreads = []) : void
	{
		if (\count($oRange)) {
			$aFetchIterator = $this->oImapClient->FetchIterate(array(
				FetchType::UID,
				FetchType::RFC822_SIZE,
				FetchType::INTERNALDATE,
				FetchType::FLAGS,
				FetchType::BODYSTRUCTURE,
				$this->getEnvelopeOrHeadersRequestString()
			), (string) $oRange, $oRange->UID);
			// FETCH does not respond in the id order of the SequenceSet, so we prefill $aCollection for the right sort order.
			$aCollection = \array_fill_keys($oRange->getArrayCopy(), null);
			foreach ($aFetchIterator as /* @var $oFetchResponseItem \MailSo\Imap\FetchResponse */ $oFetchResponseItem) {
				$id = $oRange->UID
					? $oFetchResponseItem->GetFetchValue(FetchType::UID)
					: $oFetchResponseItem->oImapResponse->ResponseList[1];
				$oMessage = Message::fromFetchResponse($oMessageCollection->FolderName, $oFetchResponseItem);
				if ($oMessage) {
					if ($aAllThreads) {
						$iUid = $oMessage->Uid;
						// Find thread and set it.
						// Used by GUI to delete/move the whole thread or other features
						foreach ($aAllThreads as $aMap) {
							if (\in_array($iUid, $aMap)) {
								$oMessage->SetThreads($aMap);
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
	private function GetUids(MessageListParams $oParams, string $sSearch,
		string $sFolderHash, bool $bUseSort = false) : array
	{
		$oCacher = $oParams->oCacher;
		$sFolderName = $oParams->sFolderName;

		$bUseSort = $bUseSort && $this->oImapClient->hasCapability('SORT');
		$sSort = $bUseSort ? $oParams->sSort : '';
		/* TODO: Validate $sSort
			ARRIVAL
				Internal date and time of the message.  This differs from the
				ON criteria in SEARCH, which uses just the internal date.

			CC
				[IMAP] addr-mailbox of the first "cc" address.

			DATE
				Sent date and time, as described in section 2.2.

			FROM
				[IMAP] addr-mailbox of the first "From" address.

			REVERSE
				Followed by another sort criterion, has the effect of that
				criterion but in reverse (descending) order.
				Note: REVERSE only reverses a single criterion, and does not
				affect the implicit "sequence number" sort criterion if all
				other criteria are identical.  Consequently, a sort of
				REVERSE SUBJECT is not the same as a reverse ordering of a
				SUBJECT sort.  This can be avoided by use of additional
				criteria, e.g., SUBJECT DATE vs. REVERSE SUBJECT REVERSE
				DATE.  In general, however, it's better (and faster, if the
				client has a "reverse current ordering" command) to reverse
				the results in the client instead of issuing a new SORT.

			SIZE
				Size of the message in octets.

			SUBJECT
				Base subject text.

			TO
				[IMAP] addr-mailbox of the first "To" address.

			RFC 5957:
				$this->oImapClient->hasCapability('SORT=DISPLAY')
				DISPLAYFROM, DISPLAYTO
		 */

		$bUseCacheAfterSearch = $oCacher && $oCacher->IsInited();
		$sSearchCriterias = \MailSo\Imap\SearchCriterias::fromString($this->oImapClient, $sFolderName, $sSearch, $oParams->bHideDeleted, $bUseCacheAfterSearch);
		// Disable? as there are many cases that change the result
//		$bUseCacheAfterSearch = false;

		$bReturnUid = true;
		if ($oParams->oSequenceSet) {
			$bReturnUid = $oParams->oSequenceSet->UID;
			$sSearchCriterias = $oParams->oSequenceSet . ' ' . $sSearchCriterias;
		}

		$sSerializedHash = '';
		$sSerializedLog = '';
		if ($bUseCacheAfterSearch) {
			$sSerializedHash = 'Get'
				. ($bReturnUid ? 'UIDS/' : 'IDS/')
				. ($bUseSort ? 'S' . $sSort : 'N')
				. "/{$this->oImapClient->Hash()}/{$sFolderName}/{$sSearchCriterias}";
			$sSerializedLog = "\"{$sFolderName}\" / {$sSort} / {$sSearchCriterias}";

			$sSerialized = $oCacher->Get($sSerializedHash);
			if (!empty($sSerialized)) {
				$aSerialized = \json_decode($sSerialized, true);
				if (\is_array($aSerialized) && isset($aSerialized['FolderHash'], $aSerialized['Uids']) &&
					$sFolderHash === $aSerialized['FolderHash'] &&
					\is_array($aSerialized['Uids'])
				) {
					if ($this->oLogger) {
						$this->oLogger->Write('Get Serialized '.($bReturnUid?'UIDS':'IDS').' from cache ('.$sSerializedLog.') [count:'.\count($aSerialized['Uids']).']');
					}
					return $aSerialized['Uids'];
				}
			}
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aResultUids = [];
		if ($bUseSort) {
			$aSortTypes = [];
			if ($sSort) {
				$aSortTypes[] = $sSort;
			}
			if (false === \strpos($sSort, 'DATE')) {
				// Always also sort DATE descending when DATE is not defined
				$aSortTypes[] = 'REVERSE DATE';
			}
//			$this->oImapClient->hasCapability('ESORT')
//			$aResultUids = $this->oImapClient->MessageSimpleESort($aSortTypes, $sSearchCriterias)['ALL'];
			$aResultUids = $this->oImapClient->MessageSimpleSort($aSortTypes, $sSearchCriterias, $bReturnUid);
		} else {
//			$this->oImapClient->hasCapability('ESEARCH')
//			$aResultUids = $this->oImapClient->MessageSimpleESearch($sSearchCriterias, null, $bReturnUid, \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? '' : 'UTF-8')
			$aResultUids = $this->oImapClient->MessageSimpleSearch($sSearchCriterias,        $bReturnUid, \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? '' : 'UTF-8');
		}

		if ($bUseCacheAfterSearch) {
			$oCacher->Set($sSerializedHash, \json_encode(array(
				'FolderHash' => $sFolderHash,
				'Uids' => $aResultUids
			)));

			if ($this->oLogger) {
				$this->oLogger->Write('Save Serialized '.($bReturnUid?'UIDS':'IDS').' to cache ('.$sSerializedLog.') [count:'.\count($aResultUids).']');
			}
		}

		return $aResultUids;
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
			throw new \InvalidArgumentException;
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

		$bUseThreads = $oParams->bUseThreads && $this->oImapClient->CapabilityValue('THREAD');
//			&& ($this->oImapClient->hasCapability('THREAD=REFS') || $this->oImapClient->hasCapability('THREAD=REFERENCES') || $this->oImapClient->hasCapability('THREAD=ORDEREDSUBJECT'));
		if ($oParams->iThreadUid && !$bUseThreads) {
			throw new \InvalidArgumentException('THREAD not supported');
		}

		if (!$oParams->iThreadUid) {
			$oMessageCollection->NewMessages = $this->getFolderNextMessageInformation(
				$oParams->sFolderName, $oParams->iPrevUidNext, $oInfo->UIDNEXT
			);
		}

		if ($oInfo->MESSAGES) {
			$bUseSort = $oParams->bUseSort || $oParams->sSort;
			$aAllThreads = [];
			$aUids = [];

			$message_list_limit = $this->oImapClient->Settings->message_list_limit;
			if (0 < $message_list_limit && $message_list_limit < $oInfo->MESSAGES) {
//			if ((0 < $message_list_limit && $message_list_limit < $oInfo->MESSAGES)
//			 || (!$this->oImapClient->hasCapability('SORT') && !$this->oImapClient->CapabilityValue('THREAD'))) {
				// Don't use THREAD for speed
				$oMessageCollection->Limited = true;
				if ($this->oLogger) {
					$this->oLogger->Write('List optimization (count: '.$oInfo->MESSAGES.', limit:'.$message_list_limit.')');
				}
				if (\strlen($sSearch)) {
					// Don't use SORT for speed
					$aUids = $this->GetUids($oParams, $sSearch, $oInfo->etag/*, $bUseSort*/);
				} else {
					$bUseSort = $this->oImapClient->hasCapability('SORT');
					if (2 > $oInfo->MESSAGES) {
						$aRequestIndexes = \array_slice([1], $oParams->iOffset, 1);
					} else if ($bUseSort) {
						// Attempt to sort REVERSE DATE with a bigger range then $oParams->iLimit
						$end = \min($oInfo->MESSAGES, \max(1, $oInfo->MESSAGES - $oParams->iOffset + $oParams->iLimit));
						$start = \max(1, $end - ($oParams->iLimit * 3) + 1);
						$oParams->oSequenceSet = new SequenceSet(\range($end, $start), false);
						$aRequestIndexes = $this->GetUids($oParams, '', $oInfo->etag, $bUseSort);
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
			} else {
				$aUids = ($bUseThreads && $oParams->iThreadUid)
					? [$oParams->iThreadUid]
					: $this->GetUids($oParams, '', $oInfo->etag, $bUseSort);

				if ($bUseThreads) {
					$aAllThreads = $this->MessageListThreadsMap($oMessageCollection, $oParams->oCacher);
					$oMessageCollection->totalThreads = \count($aAllThreads);
//					$iThreadLimit = $this->oImapClient->Settings->thread_limit;
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
//						$oParams->oSequenceSet = new SequenceSet($aUids);
					} else {
						// Remove all threaded UID's except the most recent of each thread
						$threadedUids = [];
						foreach ($aAllThreads as $aMap) {
							unset($aMap[\array_key_last($aMap)]);
							$threadedUids = \array_merge($threadedUids, $aMap);
						}
						$aUids = \array_diff($aUids, $threadedUids);
					}
				}

				if ($aUids && \strlen($sSearch)) {
					$aSearchedUids = $this->GetUids($oParams, $sSearch, $oInfo->etag/*, $bUseSort*/);
					if ($bUseThreads && !$oParams->iThreadUid) {
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
				$this->MessageListByRequestIndexOrUids($oMessageCollection, new SequenceSet($aUids), $aAllThreads);
			}
		} else if ($this->oLogger) {
			$this->oLogger->Write('No messages in '.$oMessageCollection->FolderName);
		}

		return $oMessageCollection;
	}

	public function FindMessageUidByMessageId(string $sFolderName, string $sMessageId) : ?int
	{
		if (!\strlen($sMessageId)) {
			throw new \InvalidArgumentException;
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aUids = $this->oImapClient->MessageSimpleSearch('HEADER Message-ID '.$sMessageId);

		return 1 === \count($aUids) && \is_numeric($aUids[0]) ? (int) $aUids[0] : null;
	}

	public function Folders(string $sParent, string $sListPattern, bool $bUseListSubscribeStatus) : ?FolderCollection
	{
//		$this->oImapClient->Settings->disable_list_status
		$oFolderCollection = $this->oImapClient->FolderStatusList($sParent, $sListPattern);
		if (!$oFolderCollection->count()) {
			return null;
		}

		if ($bUseListSubscribeStatus && !$this->oImapClient->hasCapability('LIST-EXTENDED')) {
//			$this->oLogger && $this->oLogger->Write('RFC5258 not supported, using LSUB');
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
	 * @throws \InvalidArgumentException
	 */
	public function FolderCreate(string $sFolderNameInUtf8, string $sFolderParentFullName = '', bool $bSubscribeOnCreation = true, string $sDelimiter = '') : ?\MailSo\Imap\Folder
	{
		$sFolderNameInUtf8 = \trim($sFolderNameInUtf8);
		$sFolderParentFullName = \trim($sFolderParentFullName);

		if (!\strlen($sFolderNameInUtf8)) {
			throw new \InvalidArgumentException;
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
	public function FolderMove(string $sPrevFolderFullName, string $sNextFolderFullNameInUtf, bool $bSubscribeOnMove = true) : self
	{
		if (!$this->oImapClient->FolderHierarchyDelimiter($sPrevFolderFullName)) {
			// TODO: Translate
			throw new \MailSo\RuntimeException('Cannot move non-existent folder.');
		}
		return $this->folderModify($sPrevFolderFullName, $sNextFolderFullNameInUtf, $bSubscribeOnMove);
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function FolderRename(string $sPrevFolderFullName, string $sNewTopFolderNameInUtf, bool $bSubscribeOnRename = true) : string
	{
		$sDelimiter = $this->oImapClient->FolderHierarchyDelimiter($sPrevFolderFullName);
		if (!$sDelimiter) {
			// TODO: Translate
			throw new \MailSo\RuntimeException('Cannot rename non-existent folder.');
		}

		if (\strlen($sDelimiter) && false !== \strpos($sNewTopFolderNameInUtf, $sDelimiter)) {
			// TODO: Translate
			throw new \MailSo\RuntimeException('New folder name contains delimiter.');
		}

		$iLast = \strrpos($sPrevFolderFullName, $sDelimiter);
		$sNewFolderFullName = (false === $iLast ? '' : \substr($sPrevFolderFullName, 0, $iLast + 1))
			. $sNewTopFolderNameInUtf;

		$this->folderModify($sPrevFolderFullName, $sNewFolderFullName, $bSubscribeOnRename);

		return $sNewFolderFullName;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 */
	protected function folderModify(string $sPrevFolderFullName, string $sNewFolderFullName, bool $bSubscribe) : self
	{
		if (!\strlen($sPrevFolderFullName) || !\strlen($sNewFolderFullName)) {
			throw new \InvalidArgumentException;
		}

		$oSubscribedFolders = array();
		if ($bSubscribe) {
			$oSubscribedFolders = $this->oImapClient->FolderSubscribeList($sPrevFolderFullName, '*');
			foreach ($oSubscribedFolders as /* @var $oFolder \MailSo\Imap\Folder */ $oFolder) {
				$this->oImapClient->FolderUnsubscribe($oFolder->FullName);
			}
		}

		$this->oImapClient->FolderRename($sPrevFolderFullName, $sNewFolderFullName);

		foreach ($oSubscribedFolders as /* @var $oFolder \MailSo\Imap\Folder */ $oFolder) {
			$sFolderFullNameForResubscribe = $oFolder->FullName;
			if (\str_starts_with($sFolderFullNameForResubscribe, $sPrevFolderFullName)) {
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
	public function SetLogger(\MailSo\Log\Logger $oLogger) : void
	{
		$this->oLogger = $oLogger;
		$this->oImapClient->SetLogger($oLogger);
	}

	public function __call(string $name, array $arguments) /*: mixed*/
	{
		return $this->oImapClient->{$name}(...$arguments);
	}
}
