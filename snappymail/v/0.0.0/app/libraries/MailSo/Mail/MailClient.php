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
	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @var \MailSo\Imap\ImapClient
	 */
	private $oImapClient;

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
		if (!\MailSo\Base\Validator::RangeInt($iIndex, 1))
		{
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

		$iBodyTextLimit = $this->oImapClient->Settings->body_text_limit;

		$aFetchResponse = $this->oImapClient->Fetch(array(FetchType::BODYSTRUCTURE), $iIndex, $bIndexIsUid);
		if (\count($aFetchResponse) && isset($aFetchResponse[0]))
		{
			$oBodyStructure = $aFetchResponse[0]->GetFetchBodyStructure();
			if ($oBodyStructure)
			{
				foreach ($oBodyStructure->GetHtmlAndPlainParts() as $oPart)
				{
					$sLine = FetchType::BODY_PEEK.'['.$oPart->PartID().']';
					if (0 < $iBodyTextLimit && $iBodyTextLimit < $oPart->Size()) {
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

		if (!$oBodyStructure)
		{
			$aFetchItems[] = FetchType::BODYSTRUCTURE;
		}

		$aFetchResponse = $this->oImapClient->Fetch($aFetchItems, $iIndex, $bIndexIsUid);
		if (\count($aFetchResponse))
		{
			$oMessage = Message::NewFetchResponseInstance($sFolderName, $aFetchResponse[0], $oBodyStructure);
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
		if (!\is_callable($mCallback))
		{
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

		if (\count($aFetchResponse))
		{
			$sMime = $aFetchResponse[0]->GetFetchValue(
				\strlen($sMimeIndex)
					? FetchType::BODY.'['.$sMimeIndex.'.MIME]'
					: FetchType::BODY_HEADER
			);

			if (\strlen($sMime))
			{
				$oHeaders = new \MailSo\Mime\HeaderCollection($sMime);

				if (\strlen($sMimeIndex))
				{
					$sFileName = $oHeaders->ParameterValue(MimeHeader::CONTENT_DISPOSITION, MimeParameter::FILENAME);
					if (!\strlen($sFileName)) {
						$sFileName = $oHeaders->ParameterValue(MimeHeader::CONTENT_TYPE, MimeParameter::NAME);
					}

					$sMailEncoding = \MailSo\Base\StreamWrappers\Binary::GetInlineDecodeOrEncodeFunctionName(
						$oHeaders->ValueByName(MimeHeader::CONTENT_TRANSFER_ENCODING)
					);

					// RFC 3516
					// Should mailserver decode or PHP?
					if ($sMailEncoding && $this->oImapClient->IsSupported('BINARY')) {
						$sMailEncoding = '';
						$sPeek = FetchType::BINARY_PEEK;
					}

					$sContentType = $oHeaders->ValueByName(MimeHeader::CONTENT_TYPE);
				}
				else
				{
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
					if (\strlen($sLiteralAtomUpperCase) && \is_resource($rImapLiteralStream) && 'FETCH' === $sParent)
					{
						$mCallback($sMailEncoding
							? \MailSo\Base\StreamWrappers\Binary::CreateStream($rImapLiteralStream, $sMailEncoding)
							: $rImapLiteralStream,
							$sContentType, $sFileName, $sMimeIndex);
					}
				}
			)), $iIndex, true);

		return ($aFetchResponse && 1 === \count($aFetchResponse));
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageDelete(string $sFolder, SequenceSet $oRange, bool $bExpungeAll = false) : self
	{
		if (!\strlen($sFolder) || !\count($oRange))
		{
			throw new \InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFolder);

		$this->oImapClient->MessageStoreFlag($oRange,
			array(MessageFlag::DELETED),
			StoreAction::ADD_FLAGS_SILENT
		);

		if ($bExpungeAll && $this->oImapClient->Settings->expunge_all_on_delete) {
			$this->oImapClient->FolderExpunge();
		} else {
			$this->oImapClient->FolderExpunge($oRange);
		}

		return $this;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageMove(string $sFromFolder, string $sToFolder, SequenceSet $oRange) : self
	{
		if (!$sFromFolder || !$sToFolder || !\count($oRange)) {
			throw new \InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFromFolder);

		if ($this->oImapClient->IsSupported('MOVE')) {
			$this->oImapClient->MessageMove($sToFolder, $oRange);
		} else {
			$this->oImapClient->MessageCopy($sToFolder, $oRange);
			$this->MessageDelete($sFromFolder, $oRange, true);
		}

		return $this;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageCopy(string $sFromFolder, string $sToFolder, SequenceSet $oRange) : self
	{
		if (!$sFromFolder || !$sToFolder || !\count($oRange))
		{
			throw new \InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFromFolder);
		$this->oImapClient->MessageCopy($sToFolder, $oRange);

		return $this;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderUnselect() : self
	{
		if ($this->oImapClient->IsSelected())
		{
			$this->oImapClient->FolderUnselect();
		}

		return $this;
	}

	/**
	 * @param resource $rMessageStream
	 */
	public function MessageAppendStream($rMessageStream, int $iMessageStreamSize, string $sFolderToSave, array $aAppendFlags = null, int &$iUid = null) : self
	{
		if (!\is_resource($rMessageStream) || !\strlen($sFolderToSave))
		{
			throw new \InvalidArgumentException;
		}

		$iUid = $this->oImapClient->MessageAppendStream(
			$sFolderToSave, $rMessageStream, $iMessageStreamSize, $aAppendFlags);

		return $this;
	}

	public function MessageAppendFile(string $sMessageFileName, string $sFolderToSave, array $aAppendFlags = null, int &$iUid = null) : self
	{
		if (!\is_file($sMessageFileName) || !\is_readable($sMessageFileName))
		{
			throw new \InvalidArgumentException;
		}

		$iMessageStreamSize = \filesize($sMessageFileName);
		$rMessageStream = \fopen($sMessageFileName, 'rb');

		$this->MessageAppendStream($rMessageStream, $iMessageStreamSize, $sFolderToSave, $aAppendFlags, $iUid);

		if (\is_resource($rMessageStream))
		{
			fclose($rMessageStream);
		}

		return $this;
	}

	public function GenerateImapClientHash() : string
	{
		return \md5('ImapClientHash/'.
			$this->oImapClient->GetLogginedUser() . '@' .
			$this->oImapClient->GetConnectedHost() . ':' .
			$this->oImapClient->GetConnectedPort()
		);
	}

	/**
	 * Returns list of new messages since $iPrevUidNext
	 * Currently only for INBOX
	 */
	private function getFolderNextMessageInformation(string $sFolderName, int $iPrevUidNext, int $iCurrentUidNext) : array
	{
		$aNewMessages = array();

		if ($iPrevUidNext && $iPrevUidNext != $iCurrentUidNext && 'INBOX' === $sFolderName && $this->oImapClient->Settings->fetch_new_messages) {
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
						'Folder' => $sFolderName,
						'Uid' => $iUid,
						'subject' => $oHeaders->ValueByName(MimeHeader::SUBJECT, !$sContentTypeCharset),
						'From' => $oHeaders->GetAsEmailCollection(MimeHeader::FROM_, !$sContentTypeCharset)
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
		$aFlags = array();
		if ($oRange && \count($oRange)) {
//			$oInfo = $this->oImapClient->FolderExamine($sFolderName);
			$oInfo = $this->oImapClient->FolderStatusAndSelect($sFolderName);
			$aFetchResponse = $this->oImapClient->Fetch(array(
				FetchType::UID,
				FetchType::FLAGS
			), (string) $oRange, $oRange->UID);
			foreach ($aFetchResponse as $oFetchResponse) {
				$iUid = (int) $oFetchResponse->GetFetchValue(FetchType::UID);
				$aLowerFlags = \array_map('mb_strtolower', \array_map('\\MailSo\\Base\\Utils::Utf7ModifiedToUtf8', $oFetchResponse->GetFetchValue(FetchType::FLAGS)));
				$aFlags[] = array(
					'Uid' => $iUid,
					'Flags' => $aLowerFlags
				);
			}
		} else {
			$oInfo = $this->oImapClient->FolderStatus($sFolderName);
		}

		return array(
			'Folder' => $sFolderName,
			'totalEmails' => $oInfo->MESSAGES,
			'unreadEmails' => $oInfo->UNSEEN,
			'UidNext' => $oInfo->UIDNEXT,
			'UidValidity' => $oInfo->UIDVALIDITY,
			'HighestModSeq' => $oInfo->HIGHESTMODSEQ,
			'AppendLimit' => $oInfo->APPENDLIMIT ?: $this->oImapClient->AppendLimit(),
			'MailboxId' => $oInfo->MAILBOXID ?: '',
//			'Flags' => $oInfo->Flags,
//			'PermanentFlags' => $oInfo->PermanentFlags,
			'Hash' => $oInfo->getHash($this->GenerateImapClientHash()),
			'MessagesFlags' => $aFlags,
			'NewMessages' => $this->getFolderNextMessageInformation(
				$sFolderName,
				$iPrevUidNext,
				\intval($oInfo->UIDNEXT)
			)
		);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderHash(string $sFolderName) : string
	{
		return $this->oImapClient->FolderStatus($sFolderName)->getHash($this->GenerateImapClientHash());
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function MessageListThreadsMap(string $sFolderName, string $sFolderHash, ?\MailSo\Cache\CacheClient $oCacher) : array
	{
//		$iThreadLimit = $this->oImapClient->Settings->thread_limit;

		$sSearchHash = '';

		if ('' === \trim($sSearchHash)) {
			$sSearchHash = 'ALL';
		}

		if ($oCacher && $oCacher->IsInited()) {
			$sSerializedHashKey =
				"ThreadsMapSorted/{$sSearchHash}/{$sFolderName}/{$sFolderHash}";
//				"ThreadsMapSorted/{$sSearchHash}/{$iThreadLimit}/{$sFolderName}/{$sFolderHash}";

			if ($this->oLogger) {
				$this->oLogger->Write($sSerializedHashKey);
			}

			$sSerializedUids = $oCacher->Get($sSerializedHashKey);
			if (!empty($sSerializedUids)) {
				$aSerializedUids = \json_decode($sSerializedUids, true);
				if (isset($aSerializedUids['ThreadsUids']) && \is_array($aSerializedUids['ThreadsUids'])) {
					if ($this->oLogger) {
						$this->oLogger->Write('Get Serialized Thread UIDS from cache ("'.$sFolderName.'" / '.$sSearchHash.') [count:'.\count($aSerializedUids['ThreadsUids']).']');
					}
					return $aSerializedUids['ThreadsUids'];
				}
			}
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aResult = array();
		try
		{
			foreach ($this->oImapClient->MessageSimpleThread($sSearchHash) as $mItem) {
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

		if ($oCacher && $oCacher->IsInited() && !empty($sSerializedHashKey))
		{
			$oCacher->Set($sSerializedHashKey, \json_encode(array(
				'ThreadsUids' => $aResult
			)));

			if ($this->oLogger)
			{
				$this->oLogger->Write('Save Serialized Thread UIDS to cache ("'.$sFolderName.'" / '.$sSearchHash.') [count:'.\count($aResult).']');
			}
		}

		return $aResult;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	protected function MessageListByRequestIndexOrUids(MessageCollection $oMessageCollection, SequenceSet $oRange) : void
	{
		if (\count($oRange))
		{
			$aFetchResponse = $this->oImapClient->Fetch(array(
				FetchType::UID,
				FetchType::RFC822_SIZE,
				FetchType::INTERNALDATE,
				FetchType::FLAGS,
				FetchType::BODYSTRUCTURE,
				$this->getEnvelopeOrHeadersRequestString()
			), (string) $oRange, $oRange->UID);

			if (\count($aFetchResponse))
			{
				$aCollection = \array_fill_keys($oRange->getArrayCopy(), null);
				foreach ($aFetchResponse as /* @var $oFetchResponseItem \MailSo\Imap\FetchResponse */ $oFetchResponseItem) {
					$id = $oRange->UID
						? $oFetchResponseItem->GetFetchValue(FetchType::UID)
						: $this->oImapResponse->ResponseList[1];
					$aCollection[$id] = Message::NewFetchResponseInstance($oMessageCollection->FolderName, $oFetchResponseItem);
				}
				$oMessageCollection->exchangeArray(\array_values(\array_filter($aCollection)));
			}
		}
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 */
	public function IsThreadsSupported() : bool
	{
		return $this->oImapClient->IsSupported('THREAD=REFS') ||
			$this->oImapClient->IsSupported('THREAD=REFERENCES') ||
			$this->oImapClient->IsSupported('THREAD=ORDEREDSUBJECT');
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	private function GetUids(MessageListParams $oParams, string $sSearch,
		string $sFolderName, string $sFolderHash,
		bool $bUseSortIfSupported = false, string $sSort = '') : array
	{
		$oCacher = $oParams->oCacher;
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
				$this->oImapClient->IsSupported('SORT=DISPLAY')
				DISPLAYFROM, DISPLAYTO
		 */

		$aResultUids = false;
		$bUidsFromCacher = false;
		$bUseCacheAfterSearch = $oCacher && $oCacher->IsInited();

		$sSerializedHash = '';
		$sSerializedLog = '';

		$bUseSortIfSupported = $bUseSortIfSupported && !\strlen($sSearch) && $this->oImapClient->IsSupported('SORT');

		$sSearchCriterias = \MailSo\Imap\SearchCriterias::fromString($this->oImapClient, $sFolderName, $sSearch, $oParams->bHideDeleted, $bUseCacheAfterSearch);
		// Disabled for now as there are many cases that change the result
		$bUseCacheAfterSearch = false;
		if ($bUseCacheAfterSearch) {
			$sSerializedHash = 'GetUids/'.
				($bUseSortIfSupported ? 'S' . $sSort : 'N').'/'.
				$this->GenerateImapClientHash().'/'.
				$sFolderName.'/'.$sSearchCriterias;
			$sSerializedLog = '"'.$sFolderName.'" / '.$sSearchCriterias.'';

			$sSerialized = $oCacher->Get($sSerializedHash);
			if (!empty($sSerialized)) {
				$aSerialized = \json_decode($sSerialized, true);
				if (\is_array($aSerialized) && isset($aSerialized['FolderHash'], $aSerialized['Uids']) &&
					$sFolderHash === $aSerialized['FolderHash'] &&
					\is_array($aSerialized['Uids'])
				) {
					if ($this->oLogger) {
						$this->oLogger->Write('Get Serialized UIDS from cache ('.$sSerializedLog.') [count:'.\count($aSerialized['Uids']).']');
					}

					$aResultUids = $aSerialized['Uids'];
					$bUidsFromCacher = true;
				}
			}
		}

		if (!$bUidsFromCacher) {
			if ($bUseSortIfSupported) {
//				$this->oImapClient->IsSupported('ESORT')
//				$aResultUids = $this->oImapClient->MessageSimpleESort(array($sSort ?: 'REVERSE DATE'), $sSearchCriterias)['ALL'];
				$aResultUids = $this->oImapClient->MessageSimpleSort(array($sSort ?: 'REVERSE DATE'), $sSearchCriterias);
			} else {
//				$this->oImapClient->IsSupported('ESEARCH')
//				$aResultUids = $this->oImapClient->MessageSimpleESearch($sSearchCriterias, null, true, \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? '' : 'UTF-8')
				$aResultUids = $this->oImapClient->MessageSimpleSearch($sSearchCriterias,        true, \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? '' : 'UTF-8');
			}

			if ($bUseCacheAfterSearch) {
				$oCacher->Set($sSerializedHash, \json_encode(array(
					'FolderHash' => $sFolderHash,
					'Uids' => $aResultUids
				)));

				if ($this->oLogger) {
					$this->oLogger->Write('Save Serialized UIDS to cache ('.$sSerializedLog.') [count:'.\count($aResultUids).']');
				}
			}
		}

		return \is_array($aResultUids) ? $aResultUids : array();
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
		if (!\MailSo\Base\Validator::RangeInt($oParams->iOffset, 0) ||
			!\MailSo\Base\Validator::RangeInt($oParams->iLimit, 0, 999))
		{
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

		$aAllThreads = [];

		$bUseThreads = $oParams->bUseThreads
			&& ($this->oImapClient->IsSupported('THREAD=REFS') || $this->oImapClient->IsSupported('THREAD=REFERENCES') || $this->oImapClient->IsSupported('THREAD=ORDEREDSUBJECT'));
		if ($oParams->iThreadUid && !$bUseThreads) {
			throw new \InvalidArgumentException('THREAD not supported');
		}

		if (!$oParams->oCacher || !($oParams->oCacher instanceof \MailSo\Cache\CacheClient)) {
			$oParams->oCacher = null;
		}

		$oMessageCollection->FolderHash = $oInfo->getHash($this->GenerateImapClientHash());

		if (!$oParams->iThreadUid) {
			$oMessageCollection->NewMessages = $this->getFolderNextMessageInformation(
				$oParams->sFolderName, $oParams->iPrevUidNext, $oInfo->UIDNEXT
			);
		}

		if ($oInfo->MESSAGES) {
			if (0 < $this->oImapClient->Settings->message_list_limit && $this->oImapClient->Settings->message_list_limit < $oInfo->MESSAGES) {
				if ($this->oLogger) {
					$this->oLogger->Write('List optimization (count: '.$oInfo->MESSAGES.
						', limit:'.$this->oImapClient->Settings->message_list_limit.')');
				}
				if (\strlen($sSearch)) {
					$aUids = $this->GetUids($oParams, $sSearch,
						$oMessageCollection->FolderName, $oMessageCollection->FolderHash);

					$oMessageCollection->totalEmails = \count($aUids);
					if ($oMessageCollection->totalEmails) {
						$this->MessageListByRequestIndexOrUids(
							$oMessageCollection,
							new SequenceSet(\array_slice($aUids, $oParams->iOffset, $oParams->iLimit))
						);
					}
				} else {
					$oMessageCollection->totalEmails = $oInfo->MESSAGES;
					if (1 < $oInfo->MESSAGES) {
						$end = \max(1, $oInfo->MESSAGES - $oParams->iOffset);
						$start = \max(1, $end - $oParams->iLimit + 1);
						$aRequestIndexes = \range($start, $end);
					} else {
						$aRequestIndexes = \array_slice([1], $oParams->iOffset, 1);
					}
					$this->MessageListByRequestIndexOrUids($oMessageCollection, new SequenceSet($aRequestIndexes, false));
				}
			} else {
				$aUids = [];
				$bUseSortIfSupported = $oParams->bUseSortIfSupported && $this->oImapClient->IsSupported('SORT');
				if ($bUseThreads) {
					$aAllThreads = $this->MessageListThreadsMap($oMessageCollection->FolderName, $oMessageCollection->FolderHash, $oParams->oCacher);
					$oMessageCollection->totalThreads = \count($aAllThreads);
//					$iThreadLimit = $this->oImapClient->Settings->thread_limit;
					if ($oParams->iThreadUid) {
						$aUids = [$oParams->iThreadUid];
						// Only show the selected thread messages
						foreach ($aAllThreads as $aMap) {
							if (\in_array($oParams->iThreadUid, $aMap)) {
								$aUids = $aMap;
								break;
							}
						}
					} else {
						$aUids = $this->GetUids($oParams, '',
							$oMessageCollection->FolderName, $oMessageCollection->FolderHash, $bUseSortIfSupported, $oParams->sSort);
						// Remove all threaded UID's except the most recent of each thread
						$threadedUids = [];
						foreach ($aAllThreads as $aMap) {
							unset($aMap[\array_key_last($aMap)]);
							$threadedUids = \array_merge($threadedUids, $aMap);
						}
						$aUids = \array_diff($aUids, $threadedUids);
					}
				} else {
					$aUids = $this->GetUids($oParams, '',
						$oMessageCollection->FolderName, $oMessageCollection->FolderHash, $bUseSortIfSupported, $oParams->sSort);
				}

				if ($aUids && \strlen($sSearch)) {
					$aSearchedUids = $this->GetUids($oParams, $sSearch,
						$oMessageCollection->FolderName, $oMessageCollection->FolderHash);
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

				$oMessageCollection->totalEmails = \count($aUids);

				if (\count($aUids)) {
					$this->MessageListByRequestIndexOrUids(
						$oMessageCollection,
						new SequenceSet(\array_slice($aUids, $oParams->iOffset, $oParams->iLimit))
					);
				}
			}
		} else if ($this->oLogger) {
			$this->oLogger->Write('No messages in '.$oMessageCollection->FolderName);
		}

		if ($aAllThreads && !$oParams->iThreadUid) {
			foreach ($oMessageCollection as $oMessage) {
				$iUid = $oMessage->Uid();
				// Find thread and set it.
				// Used by GUI to delete/move the whole thread or other features
				foreach ($aAllThreads as $aMap) {
					if (\in_array($iUid, $aMap)) {
						$oMessage->SetThreads($aMap);
						break;
					}
				}
			}
		}

		return $oMessageCollection;
	}

	public function FindMessageUidByMessageId(string $sFolderName, string $sMessageId) : ?int
	{
		if (!\strlen($sMessageId))
		{
			throw new \InvalidArgumentException;
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aUids = $this->oImapClient->MessageSimpleSearch('HEADER Message-ID '.$sMessageId);

		return 1 === \count($aUids) && \is_numeric($aUids[0]) ? (int) $aUids[0] : null;
	}

	public function Folders(string $sParent, string $sListPattern, bool $bUseListSubscribeStatus) : ?FolderCollection
	{
		$aImapSubscribedFoldersHelper = null;
		if ($this->oImapClient->IsSupported('LIST-EXTENDED')) {
			$bUseListSubscribeStatus = false;
		} else if ($bUseListSubscribeStatus) {
			//\SnappyMail\Log::warning('IMAP', 'RFC5258 not supported, using LSUB');
			try
			{
				$aSubscribedFolders = $this->oImapClient->FolderSubscribeList($sParent, $sListPattern);
				$aImapSubscribedFoldersHelper = array();
				foreach ($aSubscribedFolders as /* @var $oImapFolder \MailSo\Imap\Folder */ $oImapFolder)
				{
					$aImapSubscribedFoldersHelper[] = $oImapFolder->FullName();
				}
			}
			catch (\Throwable $oException)
			{
				\SnappyMail\Log::error('IMAP', 'FolderSubscribeList: ' . $oException->getMessage());
			}
		}

//			$this->oImapClient->Settings->disable_list_status
		$aFolders = $this->oImapClient->IsSupported('LIST-STATUS')
			? $this->oImapClient->FolderStatusList($sParent, $sListPattern)
			: $this->oImapClient->FolderList($sParent, $sListPattern);
		if (!$aFolders) {
			return null;
		}

		$iOptimizationLimit = $this->oImapClient->Settings->folder_list_limit;
		$oFolderCollection = new FolderCollection;
		$oFolderCollection->Optimized = 10 < $iOptimizationLimit && \count($aFolders) > $iOptimizationLimit;

		$sINBOX = 'INBOX';
		foreach ($aFolders as $sFullName => /* @var $oImapFolder \MailSo\Imap\Folder */ $oImapFolder) {
			$oMailFolder = new Folder($oImapFolder,
				($bUseListSubscribeStatus && (null === $aImapSubscribedFoldersHelper || \in_array($sFullName, $aImapSubscribedFoldersHelper)))
				|| $oImapFolder->IsInbox()
			);
			if ($oImapFolder->IsInbox()) {
				$sINBOX = $sFullName;
			}
			$aFolders[$sFullName] = $oMailFolder;

			// Add NonExistent folders
			$sDelimiter = $oMailFolder->Delimiter();
			$aFolderExplode = \explode($sDelimiter, $sFullName);
			\array_pop($aFolderExplode);
			while ($aFolderExplode) {
				$sNonExistentFolderFullName = \implode($sDelimiter, $aFolderExplode);
				if (!isset($aFolders[$sNonExistentFolderFullName])) {
					try
					{
						$aFolders[$sNonExistentFolderFullName] =
							Folder::NewNonExistentInstance($sNonExistentFolderFullName, $sDelimiter);
					}
					catch (\Throwable $oExc)
					{
						unset($oExc);
					}
				}
				\array_pop($aFolderExplode);
			}
		}

		$oFolderCollection->exchangeArray(\array_values($aFolders));

		$oFolderCollection->TotalCount = \count($aFolders);

		return $oFolderCollection;
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function FolderCreate(string $sFolderNameInUtf8, string $sFolderParentFullName = '', bool $bSubscribeOnCreation = true, string $sDelimiter = '') : ?Folder
	{
		$sFolderNameInUtf8 = \trim($sFolderNameInUtf8);
		$sFolderParentFullName = \trim($sFolderParentFullName);

		if (!\strlen($sFolderNameInUtf8))
		{
			throw new \InvalidArgumentException;
		}

		if (!\strlen($sDelimiter) || \strlen($sFolderParentFullName))
		{
			$sDelimiter = $this->oImapClient->FolderHierarchyDelimiter($sFolderParentFullName);
			if (null === $sDelimiter)
			{
				// TODO: Translate
				throw new \MailSo\RuntimeException(
					\strlen($sFolderParentFullName)
						? 'Cannot create folder in non-existent parent folder.'
						: 'Cannot get folder delimiter.');
			}

			if (\strlen($sDelimiter) && \strlen($sFolderParentFullName))
			{
				$sFolderParentFullName .= $sDelimiter;
			}
		}

		if (\strlen($sDelimiter) && false !== \strpos($sFolderNameInUtf8, $sDelimiter))
		{
			// TODO: Translate
			throw new \MailSo\RuntimeException(
				'New folder name contains delimiter.');
		}

		$sFullNameToCreate = $sFolderParentFullName.$sFolderNameInUtf8;

		$this->oImapClient->FolderCreate($sFullNameToCreate);

		if ($bSubscribeOnCreation)
		{
			$this->oImapClient->FolderSubscribe($sFullNameToCreate);
		}

		$aFolders = $this->oImapClient->IsSupported('LIST-STATUS')
			? $this->oImapClient->FolderStatusList($sFullNameToCreate, '')
			: $this->oImapClient->FolderList($sFullNameToCreate, '');
		$oImapFolder = $aFolders[$sFullNameToCreate];
		return $oImapFolder ? new Folder($oImapFolder, $bSubscribeOnCreation) : null;
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
		if (!\strlen($sPrevFolderFullName) || !\strlen($sNewFolderFullName))
		{
			throw new \InvalidArgumentException;
		}

		$aSubscribeFolders = array();
		if ($bSubscribe)
		{
			$aSubscribeFolders = $this->oImapClient->FolderSubscribeList($sPrevFolderFullName, '*');
			foreach ($aSubscribeFolders as /* @var $oFolder \MailSo\Imap\Folder */ $oFolder)
			{
				$this->oImapClient->FolderUnsubscribe($oFolder->FullName());
			}
		}

		$this->oImapClient->FolderRename($sPrevFolderFullName, $sNewFolderFullName);

		foreach ($aSubscribeFolders as /* @var $oFolder \MailSo\Imap\Folder */ $oFolder)
		{
			$sFolderFullNameForResubscrine = $oFolder->FullName();
			if (0 === \strpos($sFolderFullNameForResubscrine, $sPrevFolderFullName))
			{
				$sNewFolderFullNameForResubscrine = $sNewFolderFullName.
					\substr($sFolderFullNameForResubscrine, \strlen($sPrevFolderFullName));

				$this->oImapClient->FolderSubscribe($sNewFolderFullNameForResubscrine);
			}
		}

		return $this;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 */
	public function FolderDelete(string $sFolderFullName) : self
	{
		if (!\strlen($sFolderFullName) || 'INBOX' === $sFolderFullName) {
			throw new \InvalidArgumentException;
		}

		if ($this->oImapClient->IsSupported('IMAP4rev2')) {
			$oInfo = $this->oImapClient->FolderExamine($sFolderFullName);
		} else {
			$oInfo = $this->oImapClient->FolderStatus($sFolderFullName);
		}
		if ($oInfo->MESSAGES) {
			throw new Exceptions\NonEmptyFolder;
		}

		$this->oImapClient->FolderUnsubscribe($sFolderFullName);

		$this->oImapClient->FolderUnselect();
		$this->oImapClient->FolderDelete($sFolderFullName);

		return $this;
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function FolderClear(string $sFolderFullName) : self
	{
		if (0 < $this->oImapClient->FolderSelect($sFolderFullName)->MESSAGES) {
			$this->oImapClient->MessageStoreFlag(new SequenceSet('1:*', false),
				array(MessageFlag::DELETED),
				StoreAction::ADD_FLAGS_SILENT
			);
			$this->oImapClient->FolderExpunge();
		}
		return $this;
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function FolderSubscribe(string $sFolderFullName, bool $bSubscribe) : self
	{
		if (!\strlen($sFolderFullName)) {
			throw new \InvalidArgumentException;
		}
		$this->oImapClient->{$bSubscribe ? 'FolderSubscribe' : 'FolderUnsubscribe'}($sFolderFullName);
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

	public function GetPersonalNamespace() : string
	{
		$oNamespace = $this->oImapClient->GetNamespace();
		return $oNamespace ? $oNamespace->GetPersonalNamespace() : '';
	}

	public function __call(string $name, array $arguments) /*: mixed*/
	{
		return $this->oImapClient->{$name}(...$arguments);
	}

	/**
	 * RFC 5464
	 */

	public function FolderDeleteMetadata($sFolderName, array $aEntries) : void
	{
		$this->oImapClient->FolderSetMetadata($sFolderName, \array_fill_keys(\array_keys($aEntries), null));
	}
}
