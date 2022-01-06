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

use MailSo\Imap\Enumerations\FolderResponseStatus;
use MailSo\Imap\Enumerations\StoreAction;
use MailSo\Imap\SequenceSet;

/**
 * @category MailSo
 * @package Mail
 */
class MailClient
{
	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @var \MailSo\Imap\ImapClient
	 */
	private $oImapClient;

	function __construct()
	{
		$this->oLogger = null;

		$this->oImapClient = new \MailSo\Imap\ImapClient;
		$this->oImapClient->SetTimeOuts(10, \MailSo\Config::$ImapTimeout);
	}

	public function ImapClient() : \MailSo\Imap\ImapClient
	{
		return $this->oImapClient;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function Disconnect() : self
	{
		$this->oImapClient->Disconnect();
		return $this;
	}

	public function IsConnected() : bool
	{
		return $this->oImapClient->IsConnected();
	}

	public function IsLoggined() : bool
	{
		return $this->oImapClient->IsLoggined();
	}

	public function Capabilities() : array
	{
		return $this->oImapClient->Capability();
	}

	private function getEnvelopeOrHeadersRequestString() : string
	{
		if (\MailSo\Config::$MessageAllHeaders)
		{
			return \MailSo\Imap\Enumerations\FetchType::BODY_HEADER_PEEK;
		}

		return \MailSo\Imap\Enumerations\FetchType::BuildBodyCustomHeaderRequest(array(
			\MailSo\Mime\Enumerations\Header::RETURN_PATH,
			\MailSo\Mime\Enumerations\Header::RECEIVED,
			\MailSo\Mime\Enumerations\Header::MIME_VERSION,
			\MailSo\Mime\Enumerations\Header::MESSAGE_ID,
			\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
			\MailSo\Mime\Enumerations\Header::FROM_,
			\MailSo\Mime\Enumerations\Header::TO_,
			\MailSo\Mime\Enumerations\Header::CC,
			\MailSo\Mime\Enumerations\Header::BCC,
			\MailSo\Mime\Enumerations\Header::SENDER,
			\MailSo\Mime\Enumerations\Header::REPLY_TO,
			\MailSo\Mime\Enumerations\Header::DELIVERED_TO,
			\MailSo\Mime\Enumerations\Header::IN_REPLY_TO,
			\MailSo\Mime\Enumerations\Header::REFERENCES,
			\MailSo\Mime\Enumerations\Header::DATE,
			\MailSo\Mime\Enumerations\Header::SUBJECT,
			\MailSo\Mime\Enumerations\Header::X_MSMAIL_PRIORITY,
			\MailSo\Mime\Enumerations\Header::IMPORTANCE,
			\MailSo\Mime\Enumerations\Header::X_PRIORITY,
			\MailSo\Mime\Enumerations\Header::X_DRAFT_INFO,
			\MailSo\Mime\Enumerations\Header::RETURN_RECEIPT_TO,
			\MailSo\Mime\Enumerations\Header::DISPOSITION_NOTIFICATION_TO,
			\MailSo\Mime\Enumerations\Header::X_CONFIRM_READING_TO,
			\MailSo\Mime\Enumerations\Header::AUTHENTICATION_RESULTS,
			\MailSo\Mime\Enumerations\Header::X_DKIM_AUTHENTICATION_RESULTS,
			\MailSo\Mime\Enumerations\Header::LIST_UNSUBSCRIBE,
			// SPAM
			\MailSo\Mime\Enumerations\Header::X_SPAM_STATUS,
//			\MailSo\Mime\Enumerations\Header::X_SPAM_FLAG,
			\MailSo\Mime\Enumerations\Header::X_SPAMD_RESULT,
			\MailSo\Mime\Enumerations\Header::X_BOGOSITY,
			// Virus
			\MailSo\Mime\Enumerations\Header::X_VIRUS,
			\MailSo\Mime\Enumerations\Header::X_VIRUS_SCANNED,
			\MailSo\Mime\Enumerations\Header::X_VIRUS_STATUS
		), true);
//
//		return \MailSo\Imap\Enumerations\FetchType::ENVELOPE;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 * @throws \MailSo\Mail\Exceptions\Exception
	 */
	public function MessageSetFlagToAll(string $sFolderName, string $sMessageFlag, bool $bSetAction = true, bool $bSkipUnsupportedFlag = false, ?array $aCustomUids = null) : void
	{
		$this->oImapClient->FolderSelect($sFolderName);

		$oFolderInfo = $this->oImapClient->FolderCurrentInformation();
		if (!$oFolderInfo || !$oFolderInfo->IsFlagSupported($sMessageFlag))
		{
			if (!$bSkipUnsupportedFlag)
			{
				throw new Exceptions\RuntimeException('Message flag "'.$sMessageFlag.'" is not supported.');
			}
		}

		if ($oFolderInfo && 0 < $oFolderInfo->MESSAGES)
		{
			$oRange = null;
			if (\is_array($aCustomUids)) {
				if (\count($aCustomUids)) {
					$oRange = new SequenceSet($aCustomUids);
				}
			} else {
				$oRange = new SequenceSet('1:*', false);
			}

			if ($oRange) {
				$sStoreAction = $bSetAction ? StoreAction::ADD_FLAGS_SILENT : StoreAction::REMOVE_FLAGS_SILENT;
				$this->oImapClient->MessageStoreFlag($oRange, array($sMessageFlag), $sStoreAction);
			}
		}
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 * @throws \MailSo\Mail\Exceptions\Exception
	 */
	public function MessageSetFlag(string $sFolderName, SequenceSet $oRange, string $sMessageFlag, bool $bSetAction = true, bool $bSkipUnsupportedFlag = false) : void
	{
		$this->oImapClient->FolderSelect($sFolderName);

		$oFolderInfo = $this->oImapClient->FolderCurrentInformation();
		if (!$oFolderInfo || !$oFolderInfo->IsFlagSupported($sMessageFlag))
		{
			if (!$bSkipUnsupportedFlag)
			{
				throw new Exceptions\RuntimeException('Message flag "'.$sMessageFlag.'" is not supported.');
			}
		}
		else
		{
			$sStoreAction = $bSetAction ? StoreAction::ADD_FLAGS_SILENT : StoreAction::REMOVE_FLAGS_SILENT;
			$this->oImapClient->MessageStoreFlag($oRange, array($sMessageFlag), $sStoreAction);
		}
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSetFlagged(string $sFolderName, SequenceSet $oRange, bool $bSetAction = true, bool $bSkipUnsupportedFlag = false) : void
	{
		$this->MessageSetFlag($sFolderName, $oRange,
			\MailSo\Imap\Enumerations\MessageFlag::FLAGGED, $bSetAction, $bSkipUnsupportedFlag);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSetSeenToAll(string $sFolderName, bool $bSetAction = true, array $aCustomUids = null) : void
	{
		$this->MessageSetFlagToAll($sFolderName, \MailSo\Imap\Enumerations\MessageFlag::SEEN, $bSetAction, true, $aCustomUids);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSetSeen(string $sFolderName, SequenceSet $oRange, bool $bSetAction = true) : void
	{
		$this->MessageSetFlag($sFolderName, $oRange,
			\MailSo\Imap\Enumerations\MessageFlag::SEEN, $bSetAction, true);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Message(string $sFolderName, int $iIndex, bool $bIndexIsUid = true, ?\MailSo\Cache\CacheClient $oCacher = null, int $iBodyTextLimit = 0) : ?Message
	{
		if (!\MailSo\Base\Validator::RangeInt($iIndex, 1))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFolderName);

		$oBodyStructure = null;
		$oMessage = null;

		$aFetchItems = array(
			\MailSo\Imap\Enumerations\FetchType::INDEX,
			\MailSo\Imap\Enumerations\FetchType::UID,
			\MailSo\Imap\Enumerations\FetchType::RFC822_SIZE,
			\MailSo\Imap\Enumerations\FetchType::INTERNALDATE,
			\MailSo\Imap\Enumerations\FetchType::FLAGS,
			$this->getEnvelopeOrHeadersRequestString()
		);

		$aFetchResponse = $this->oImapClient->Fetch(array(\MailSo\Imap\Enumerations\FetchType::BODYSTRUCTURE), $iIndex, $bIndexIsUid);
		if (\count($aFetchResponse) && isset($aFetchResponse[0]))
		{
			$oBodyStructure = $aFetchResponse[0]->GetFetchBodyStructure();
			if ($oBodyStructure)
			{
				foreach ($oBodyStructure->SearchHtmlOrPlainParts() as $oPart)
				{
					$sLine = \MailSo\Imap\Enumerations\FetchType::BODY_PEEK.'['.$oPart->PartID().']';
					if (0 < $iBodyTextLimit && $iBodyTextLimit < $oPart->Size())
					{
						$sLine .= "<0.{$iBodyTextLimit}>";
					}

					$aFetchItems[] = $sLine;
				}

				$aSignatureParts = $oBodyStructure->SearchByContentType('application/pgp-signature');
				if (is_array($aSignatureParts) && \count($aSignatureParts))
				{
					foreach ($aSignatureParts as $oPart)
					{
						$aFetchItems[] = \MailSo\Imap\Enumerations\FetchType::BODY_PEEK.'['.$oPart->PartID().']';
					}
				}
			}
		}

		if (!$oBodyStructure)
		{
			$aFetchItems[] = \MailSo\Imap\Enumerations\FetchType::BODYSTRUCTURE;
		}

		$aFetchResponse = $this->oImapClient->Fetch($aFetchItems, $iIndex, $bIndexIsUid);
		if (\count($aFetchResponse))
		{
			$oMessage = Message::NewFetchResponseInstance(
				$sFolderName, $aFetchResponse[0], $oBodyStructure);
		}

		return $oMessage;
	}

	/**
	 * @param mixed $mCallback
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageMimeStream($mCallback, string $sFolderName, int $iIndex, bool $bIndexIsUid = true, string $sMimeIndex = '') : bool
	{
		if (!\is_callable($mCallback))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFolderName);

		$sFileName = '';
		$sContentType = '';
		$sMailEncodingName = '';

		$sMimeIndex = trim($sMimeIndex);
		$aFetchResponse = $this->oImapClient->Fetch(array(
			\strlen($sMimeIndex)
				? \MailSo\Imap\Enumerations\FetchType::BODY_PEEK.'['.$sMimeIndex.'.MIME]'
				: \MailSo\Imap\Enumerations\FetchType::BODY_HEADER_PEEK),
			$iIndex, $bIndexIsUid);

		if (\count($aFetchResponse))
		{
			$sMime = $aFetchResponse[0]->GetFetchValue(
				\strlen($sMimeIndex)
					? \MailSo\Imap\Enumerations\FetchType::BODY.'['.$sMimeIndex.'.MIME]'
					: \MailSo\Imap\Enumerations\FetchType::BODY_HEADER
			);

			if (\strlen($sMime))
			{
				$oHeaders = new \MailSo\Mime\HeaderCollection($sMime);

				if (\strlen($sMimeIndex))
				{
					$sFileName = $oHeaders->ParameterValue(
						\MailSo\Mime\Enumerations\Header::CONTENT_DISPOSITION,
						\MailSo\Mime\Enumerations\Parameter::FILENAME);

					if (!\strlen($sFileName))
					{
						$sFileName = $oHeaders->ParameterValue(
							\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
							\MailSo\Mime\Enumerations\Parameter::NAME);
					}

					$sMailEncodingName = $oHeaders->ValueByName(
						\MailSo\Mime\Enumerations\Header::CONTENT_TRANSFER_ENCODING);

					$sContentType = $oHeaders->ValueByName(
						\MailSo\Mime\Enumerations\Header::CONTENT_TYPE);
				}
				else
				{
					$sSubject = $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::SUBJECT);

					$sFileName = \strlen($sSubject) ? $sSubject : (string) $iIndex;
					$sFileName .= '.eml';

					$sContentType = 'message/rfc822';
				}
			}
		}

		$aFetchResponse = $this->oImapClient->Fetch(array(
			// Push in the aFetchCallbacks array and then called by \MailSo\Imap\Traits\ResponseParser::partialResponseLiteralCallbackCallable
			array(
				\MailSo\Imap\Enumerations\FetchType::BODY_PEEK.'['.$sMimeIndex.']',
				function ($sParent, $sLiteralAtomUpperCase, $rImapLiteralStream) use ($mCallback, $sMimeIndex, $sMailEncodingName, $sContentType, $sFileName)
				{
					if (\strlen($sLiteralAtomUpperCase) && \is_resource($rImapLiteralStream) && 'FETCH' === $sParent)
					{
						$rMessageMimeIndexStream = \strlen($sMailEncodingName)
							? \MailSo\Base\StreamWrappers\Binary::CreateStream($rImapLiteralStream,
								\MailSo\Base\StreamWrappers\Binary::GetInlineDecodeOrEncodeFunctionName(
									$sMailEncodingName, true))
							: $rImapLiteralStream;

						$mCallback($rMessageMimeIndexStream, $sContentType, $sFileName, $sMimeIndex);
					}
				}
			)), $iIndex, $bIndexIsUid);

		return ($aFetchResponse && 1 === \count($aFetchResponse));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageDelete(string $sFolder, SequenceSet $oRange, bool $bExpungeAll = false) : self
	{
		if (!\strlen($sFolder) || !\count($oRange))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFolder);

		$this->oImapClient->MessageStoreFlag($oRange,
			array(\MailSo\Imap\Enumerations\MessageFlag::DELETED),
			StoreAction::ADD_FLAGS_SILENT
		);

		if ($bExpungeAll) {
			$this->oImapClient->FolderExpunge();
		} else {
			$this->oImapClient->FolderExpunge($oRange);
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageMove(string $sFromFolder, string $sToFolder, SequenceSet $oRange, bool $bUseMoveSupported = true, bool $bExpungeAll = false) : self
	{
		if (!$sFromFolder || !$sToFolder || !\count($oRange))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFromFolder);

		if ($bUseMoveSupported && $this->oImapClient->IsSupported('MOVE'))
		{
			$this->oImapClient->MessageMove($sToFolder, $oRange);
		}
		else
		{
			$this->oImapClient->MessageCopy($sToFolder, $oRange);

			$this->MessageDelete($sFromFolder, $oRange, $bExpungeAll);
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageCopy(string $sFromFolder, string $sToFolder, SequenceSet $oRange) : self
	{
		if (!$sFromFolder || !$sToFolder || !\count($oRange))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFromFolder);
		$this->oImapClient->MessageCopy($sToFolder, $oRange);

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderUnSelect() : self
	{
		if ($this->oImapClient->IsSelected())
		{
			$this->oImapClient->FolderUnSelect();
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
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->MessageAppendStream(
			$sFolderToSave, $rMessageStream, $iMessageStreamSize, $aAppendFlags, $iUid);

		return $this;
	}

	public function MessageAppendFile(string $sMessageFileName, string $sFolderToSave, array $aAppendFlags = null, int &$iUid = null) : self
	{
		if (!\is_file($sMessageFileName) || !\is_readable($sMessageFileName))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
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

	protected function initFolderValues(string $sFolderName) : array
	{
		$aTypes = array(
			FolderResponseStatus::MESSAGES,
			FolderResponseStatus::UNSEEN,
			FolderResponseStatus::UIDNEXT
		);

		if ($this->oImapClient->IsSupported('CONDSTORE')) {
			$aTypes[] = FolderResponseStatus::HIGHESTMODSEQ;
		}
		if ($this->oImapClient->IsSupported('APPENDLIMIT')) {
			$aTypes[] = FolderResponseStatus::APPENDLIMIT;
		}
		if ($this->oImapClient->IsSupported('OBJECTID')) {
			$aTypes[] = FolderResponseStatus::MAILBOXID;
		}

		$aFolderStatus = $this->oImapClient->FolderStatus($sFolderName, $aTypes);

		return [
			\max(0, $aFolderStatus[FolderResponseStatus::MESSAGES] ?: 0),

			\max(0, $aFolderStatus[FolderResponseStatus::UNSEEN] ?: 0),

			\max(0, $aFolderStatus[FolderResponseStatus::UIDNEXT] ?: 0),

			\max(0, $aFolderStatus[FolderResponseStatus::HIGHESTMODSEQ] ?: 0),

			$aFolderStatus[FolderResponseStatus::APPENDLIMIT] ?: $this->oImapClient->AppendLimit(),

			$aFolderStatus[FolderResponseStatus::MAILBOXID] ?: ''
		];
	}

	public function GenerateImapClientHash() : string
	{
		return \md5('ImapClientHash/'.
			$this->oImapClient->GetLogginedUser().'@'.
			$this->oImapClient->GetConnectedHost().':'.
			$this->oImapClient->GetConnectedPort()
		);
	}

	public function GenerateFolderHash(string $sFolder, int $iCount, int $iUidNext, int $iHighestModSeq) : string
	{
		return \md5('FolderHash/'.$sFolder.'-'.$iCount.'-'.$iUidNext.'-'.
			$iHighestModSeq.'-'.$this->GenerateImapClientHash().'-'.
			\MailSo\Config::$MessageListPermanentFilter
		);
	}

	/**
	 * Returns list of new messages since $iPrevUidNext
	 * Currently only for INBOX
	 */
	private function getFolderNextMessageInformation(string $sFolderName, int $iPrevUidNext, int $iCurrentUidNext) : array
	{
		$aNewMessages = array();

		if ($iPrevUidNext && $iPrevUidNext != $iCurrentUidNext && 'INBOX' === $sFolderName && \MailSo\Config::$CheckNewMessages)
		{
			$this->oImapClient->FolderSelect($sFolderName);

			$aFetchResponse = $this->oImapClient->Fetch(array(
				\MailSo\Imap\Enumerations\FetchType::INDEX,
				\MailSo\Imap\Enumerations\FetchType::UID,
				\MailSo\Imap\Enumerations\FetchType::FLAGS,
				\MailSo\Imap\Enumerations\FetchType::BuildBodyCustomHeaderRequest(array(
					\MailSo\Mime\Enumerations\Header::FROM_,
					\MailSo\Mime\Enumerations\Header::SUBJECT,
					\MailSo\Mime\Enumerations\Header::CONTENT_TYPE
				))
			), $iPrevUidNext.':*', true);

			foreach ($aFetchResponse as /* @var $oFetchResponse \MailSo\Imap\FetchResponse */ $oFetchResponse)
			{
				$aFlags = \array_map('strtolower', $oFetchResponse->GetFetchValue(
					\MailSo\Imap\Enumerations\FetchType::FLAGS));

				if (!\in_array(\strtolower(\MailSo\Imap\Enumerations\MessageFlag::SEEN), $aFlags))
				{
					$iUid = (int) $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::UID);
					$sHeaders = $oFetchResponse->GetHeaderFieldsValue();

					$oHeaders = new \MailSo\Mime\HeaderCollection($sHeaders);

					$sContentTypeCharset = $oHeaders->ParameterValue(
						\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
						\MailSo\Mime\Enumerations\Parameter::CHARSET
					);

					if ($sContentTypeCharset) {
						$oHeaders->SetParentCharset($sContentTypeCharset);
					}

					$aNewMessages[] = array(
						'Folder' => $sFolderName,
						'Uid' => $iUid,
						'Subject' => $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::SUBJECT, !$sContentTypeCharset),
						'From' => $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::FROM_, !$sContentTypeCharset)
					);
				}
			}
		}

		return $aNewMessages;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderInformation(string $sFolderName, int $iPrevUidNext = 0, SequenceSet $oRange = null) : array
	{
		$aFlags = array();

		list($iCount, $iUnseenCount, $iUidNext, $iHighestModSeq, $iAppendLimit, $sMailboxId) = $this->initFolderValues($sFolderName);

		if ($oRange && \count($oRange))
		{
			$this->oImapClient->FolderSelect($sFolderName);

			$aFetchResponse = $this->oImapClient->Fetch(array(
				\MailSo\Imap\Enumerations\FetchType::INDEX,
				\MailSo\Imap\Enumerations\FetchType::UID,
				\MailSo\Imap\Enumerations\FetchType::FLAGS
			), (string) $oRange, $oRange->UID);

			foreach ($aFetchResponse as $oFetchResponse)
			{
				$iUid = (int) $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::UID);
				$aLowerFlags = \array_map('strtolower', $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::FLAGS));
				$aFlags[] = array(
					'Uid' => $iUid,
					'Flags' => $aLowerFlags
				);
			}
		}

		return array(
			'Folder' => $sFolderName,
			'Hash' => $this->GenerateFolderHash($sFolderName, $iCount, $iUidNext, $iHighestModSeq),
			'MessageCount' => $iCount,
			'MessageUnseenCount' => $iUnseenCount,
			'UidNext' => $iUidNext,
			'MessagesFlags' => $aFlags,
			'HighestModSeq' => $iHighestModSeq,
			'AppendLimit' => $iAppendLimit,
			'MailboxId' => $sMailboxId,
			'NewMessages' => $this->getFolderNextMessageInformation($sFolderName, $iPrevUidNext, $iUidNext)
		);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderHash(string $sFolderName) : string
	{
		list($iCount, $iUnseenCount, $iUidNext, $iHighestModSeq) = $this->initFolderValues($sFolderName);

		return $this->GenerateFolderHash($sFolderName, $iCount, $iUidNext, $iHighestModSeq);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function InboxUnreadCount() : int
	{
		$aFolderStatus = $this->oImapClient->FolderStatus('INBOX', array(
			FolderResponseStatus::UNSEEN
		));

		$iResult = isset($aFolderStatus[FolderResponseStatus::UNSEEN]) ?
			(int) $aFolderStatus[FolderResponseStatus::UNSEEN] : 0;

		return 0 < $iResult ? $iResult : 0;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageListThreadsMap(string $sFolderName, string $sFolderHash, ?\MailSo\Cache\CacheClient $oCacher) : array
	{
		$sSearchHash = '';
		if (0 < \MailSo\Config::$MessageListDateFilter)
		{
			$iD = \time() - 3600 * 24 * 30 * \MailSo\Config::$MessageListDateFilter;
			$iTimeFilter = \gmmktime(1, 1, 1, \gmdate('n', $iD), 1, \gmdate('Y', $iD));

			$sSearchHash .= ' SINCE '.\gmdate('j-M-Y', $iTimeFilter);
		}

		if ('' === \trim($sSearchHash))
		{
			$sSearchHash = 'ALL';
		}

		if ($oCacher && $oCacher->IsInited())
		{
			$sSerializedHashKey =
				'ThreadsMapSorted/'.$sSearchHash.'/'.$sFolderName.'/'.$sFolderHash;

			if ($this->oLogger)
			{
				$this->oLogger->Write($sSerializedHashKey);
			}

			$sSerializedUids = $oCacher->Get($sSerializedHashKey);
			if (!empty($sSerializedUids))
			{
				$aSerializedUids = \json_decode($sSerializedUids, true);
				if (isset($aSerializedUids['ThreadsUids']) && \is_array($aSerializedUids['ThreadsUids']))
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Get Serialized Thread UIDS from cache ("'.$sFolderName.'" / '.$sSearchHash.') [count:'.\count($aSerializedUids['ThreadsUids']).']');
					}

					return $aSerializedUids['ThreadsUids'];
				}
			}
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aThreadUids = array();
		try
		{
			$aThreadUids = $this->oImapClient->MessageSimpleThread($sSearchHash);
		}
		catch (\MailSo\Imap\Exceptions\RuntimeException $oException)
		{
			\SnappyMail\Log::warning('MessageListThreadsMap ' . $oException->getMessage());
			unset($oException);
		}

		// Flatten to single levels
		$aResult = array();
		foreach ($aThreadUids as $mItem) {
			$aMap = [];
			\array_walk_recursive($mItem, function($a) use (&$aMap) { $aMap[] = $a; });
			$aResult[] = $aMap;
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
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	protected function MessageListByRequestIndexOrUids(MessageCollection $oMessageCollection, SequenceSet $oRange) : void
	{
		if (\count($oRange))
		{
			$aFetchResponse = $this->oImapClient->Fetch(array(
				\MailSo\Imap\Enumerations\FetchType::INDEX,
				\MailSo\Imap\Enumerations\FetchType::UID,
				\MailSo\Imap\Enumerations\FetchType::RFC822_SIZE,
				\MailSo\Imap\Enumerations\FetchType::INTERNALDATE,
				\MailSo\Imap\Enumerations\FetchType::FLAGS,
				\MailSo\Imap\Enumerations\FetchType::BODYSTRUCTURE,
				$this->getEnvelopeOrHeadersRequestString()
			), (string) $oRange, $oRange->UID);

			if (\count($aFetchResponse))
			{
				$sFetchType = $oRange->UID ? \MailSo\Imap\Enumerations\FetchType::UID : \MailSo\Imap\Enumerations\FetchType::INDEX;
				foreach ($aFetchResponse as /* @var $oFetchResponseItem \MailSo\Imap\FetchResponse */ $oFetchResponseItem)
				{
					if ($oRange->contains($oFetchResponseItem->GetFetchValue($sFetchType))) {
						$oMessageCollection->append(
							Message::NewFetchResponseInstance($oMessageCollection->FolderName, $oFetchResponseItem)
						);
					}
				}
			}
		}
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function IsThreadsSupported() : bool
	{
		return $this->oImapClient->IsSupported('THREAD=REFS') ||
			$this->oImapClient->IsSupported('THREAD=REFERENCES') ||
			$this->oImapClient->IsSupported('THREAD=ORDEREDSUBJECT');
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function GetUids(?\MailSo\Cache\CacheClient $oCacher, string $sSearch,
		string $sFolderName, string $sFolderHash,
		bool $bUseSortIfSupported = false, string $sSort = '') : array
	{
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
		$bUseCacheAfterSearch = true;

		$sSerializedHash = '';
		$sSerializedLog = '';

		$bUseSortIfSupported = $bUseSortIfSupported && !\strlen($sSearch) && $this->oImapClient->IsSupported('SORT');

		$sSearchCriterias = \MailSo\Imap\SearchCriterias::fromString($this->oImapClient, $sFolderName, $sSearch, 0, $bUseCacheAfterSearch);
		if ($bUseCacheAfterSearch && $oCacher && $oCacher->IsInited())
		{
			$sSerializedHash = 'GetUids/'.
				($bUseSortIfSupported ? 'S' . $sSort : 'N').'/'.
				$this->GenerateImapClientHash().'/'.
				$sFolderName.'/'.$sSearchCriterias;
			$sSerializedLog = '"'.$sFolderName.'" / '.$sSearchCriterias.'';

//			$sSerialized = $oCacher->Get($sSerializedHash);
			if (!empty($sSerialized))
			{
				$aSerialized = \json_decode($sSerialized, true);
				if (\is_array($aSerialized) && isset($aSerialized['FolderHash'], $aSerialized['Uids']) &&
					$sFolderHash === $aSerialized['FolderHash'] &&
					\is_array($aSerialized['Uids'])
				)
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Get Serialized UIDS from cache ('.$sSerializedLog.') [count:'.\count($aSerialized['Uids']).']');
					}

					$aResultUids = $aSerialized['Uids'];
					$bUidsFromCacher = true;
				}
			}
		}

		if (!\is_array($aResultUids))
		{
			if ($bUseSortIfSupported) {
//				$this->oImapClient->IsSupported('ESORT')
//				$aResultUids = $this->oImapClient->MessageSimpleESort(array($sSort ?: 'REVERSE DATE'), $sSearchCriterias)['ALL'];
				$aResultUids = $this->oImapClient->MessageSimpleSort(array($sSort ?: 'REVERSE DATE'), $sSearchCriterias);
			} else {
//				$this->oImapClient->IsSupported('ESEARCH')
//				$aResultUids = $this->oImapClient->MessageSimpleESearch($sSearchCriterias, null, true, \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? '' : 'UTF-8')
				$aResultUids = $this->oImapClient->MessageSimpleSearch($sSearchCriterias,        true, \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? '' : 'UTF-8');
			}

			if (!$bUidsFromCacher && $bUseCacheAfterSearch && \is_array($aResultUids) && $oCacher && $oCacher->IsInited() && \strlen($sSerializedHash))
			{
				$oCacher->Set($sSerializedHash, \json_encode(array(
					'FolderHash' => $sFolderHash,
					'Uids' => $aResultUids
				)));

				if ($this->oLogger)
				{
					$this->oLogger->Write('Save Serialized UIDS to cache ('.$sSerializedLog.') [count:'.\count($aResultUids).']');
				}
			}
		}

		return \is_array($aResultUids) ? $aResultUids : array();
	}

	/**
	 * Runs SORT/SEARCH when $sSearch is provided
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageList(\MailSo\Mail\MessageListParams $oParams) : MessageCollection
	{
		if (!\MailSo\Base\Validator::RangeInt($oParams->iOffset, 0) ||
			!\MailSo\Base\Validator::RangeInt($oParams->iLimit, 0, 999))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$sSearch = \trim($oParams->sSearch);

		list($iMessageRealCount, $iMessageUnseenCount, $iUidNext, $iHighestModSeq) = $this->initFolderValues($oParams->sFolderName);

		$this->oImapClient->FolderSelect($oParams->sFolderName);

		$oMessageCollection = new MessageCollection;
		$oMessageCollection->FolderName = $oParams->sFolderName;
		$oMessageCollection->Offset = $oParams->iOffset;
		$oMessageCollection->Limit = $oParams->iLimit;
		$oMessageCollection->Search = $sSearch;
		$oMessageCollection->ThreadUid = $oParams->iThreadUid;
		$oMessageCollection->Filtered = '' !== \MailSo\Config::$MessageListPermanentFilter;

		$aUids = array();
		$aAllThreads = [];

		$bUseSortIfSupported = $oParams->bUseSortIfSupported && $this->oImapClient->IsSupported('SORT');

		$bUseThreads = $oParams->bUseThreads ?
			($this->oImapClient->IsSupported('THREAD=REFS') || $this->oImapClient->IsSupported('THREAD=REFERENCES') || $this->oImapClient->IsSupported('THREAD=ORDEREDSUBJECT')) : false;

		if ($oParams->iThreadUid && !$bUseThreads)
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException('THREAD not supported');
		}

		if (!$oParams->oCacher || !($oParams->oCacher instanceof \MailSo\Cache\CacheClient))
		{
			$oParams->oCacher = null;
		}

		$oMessageCollection->FolderHash = $this->GenerateFolderHash(
			$oParams->sFolderName, $iMessageRealCount, $iUidNext, $iHighestModSeq);

		$oMessageCollection->UidNext = $iUidNext;

		if (!$oParams->iThreadUid)
		{
			$oMessageCollection->NewMessages = $this->getFolderNextMessageInformation(
				$oParams->sFolderName, $oParams->iPrevUidNext, $iUidNext);
		}

		$bSearch = false;
		$bMessageListOptimization = 0 < \MailSo\Config::$MessageListCountLimitTrigger &&
			\MailSo\Config::$MessageListCountLimitTrigger < $iMessageRealCount;

		if ($bMessageListOptimization)
		{
			$bUseSortIfSupported = false;
			$bUseThreads = false;
		}

		if ($iMessageRealCount && !$bMessageListOptimization)
		{
			if ($bUseThreads) {
				$aAllThreads = $this->MessageListThreadsMap($oMessageCollection->FolderName, $oMessageCollection->FolderHash, $oParams->oCacher);
//				$iThreadLimit = \MailSo\Config::$LargeThreadLimit;

				if ($oParams->iThreadUid)
				{
					$aUids = [$oParams->iThreadUid];
					// Only show the selected thread messages
					foreach ($aAllThreads as $aMap) {
						if (\in_array($oParams->iThreadUid, $aMap)) {
							$aUids = $aMap;
							break;
						}
					}
				}
				else
				{
					$aUids = $this->GetUids($oParams->oCacher, '',
						$oMessageCollection->FolderName, $oMessageCollection->FolderHash, $bUseSortIfSupported, $oParams->sSort);
					// Remove all threaded UID's except the most recent of each thread
					foreach ($aAllThreads as $aMap) {
						unset($aMap[\array_key_last($aMap)]);
						$aUids = \array_diff($aUids, $aMap);
					}
				}
			} else {
				$aUids = $this->GetUids($oParams->oCacher, '',
					$oMessageCollection->FolderName, $oMessageCollection->FolderHash, $bUseSortIfSupported, $oParams->sSort);
			}

			if ($aUids && \strlen($sSearch))
			{
				$aSearchedUids = $this->GetUids($oParams->oCacher, $sSearch,
					$oMessageCollection->FolderName, $oMessageCollection->FolderHash);

				if (\count($aSearchedUids))
				{
					$aNewUids = array();
					foreach ($aUids as $iUid)
					{
						if (\in_array($iUid, $aSearchedUids)) {
							$aNewUids[] = $iUid;
						} else if ($bUseThreads && !$oParams->iThreadUid) {
							foreach ($aAllThreads as $aMap) {
								if (\in_array($iUid, $aMap) && \array_intersect($aSearchedUids, $aMap)) {
									$aNewUids[] = $iUid;
									break;
								}
							}
						}
					}

					$aUids = \array_unique($aNewUids);
					unset($aNewUids);
				}
			}

			$oMessageCollection->MessageCount = $iMessageRealCount;
			$oMessageCollection->MessageUnseenCount = $iMessageUnseenCount;
			$oMessageCollection->MessageResultCount = \count($aUids);

			if (\count($aUids))
			{
				$this->MessageListByRequestIndexOrUids(
					$oMessageCollection,
					new SequenceSet(\array_slice($aUids, $oParams->iOffset, $oParams->iLimit))
				);
			}
		}
		else if ($iMessageRealCount)
		{
			if ($this->oLogger)
			{
				$this->oLogger->Write('List optimization (count: '.$iMessageRealCount.
					', limit:'.\MailSo\Config::$MessageListCountLimitTrigger.')');
			}

			$oMessageCollection->MessageCount = $iMessageRealCount;
			$oMessageCollection->MessageUnseenCount = $iMessageUnseenCount;

			if (\strlen($sSearch))
			{
				$aUids = $this->GetUids($oParams->oCacher, $sSearch,
					$oMessageCollection->FolderName, $oMessageCollection->FolderHash);

				$oMessageCollection->MessageResultCount = \count($aUids);
				if ($oMessageCollection->MessageResultCount)
				{
					$this->MessageListByRequestIndexOrUids(
						$oMessageCollection,
						new SequenceSet(\array_slice($aUids, $oParams->iOffset, $oParams->iLimit))
					);
				}
			}
			else
			{
				$oMessageCollection->MessageResultCount = $iMessageRealCount;

				if (1 < $iMessageRealCount)
				{
					$aRequestIndexes = \array_slice(\array_reverse(\range(1, $iMessageRealCount)), $oParams->iOffset, $oParams->iLimit);
				}
				else
				{
					$aRequestIndexes = \array_slice(array(1), $oParams->iOffset, $oParams->iLimit);
				}

				$this->MessageListByRequestIndexOrUids($oMessageCollection, new SequenceSet($aRequestIndexes, false));
			}
		}

		if ($aAllThreads && !$oParams->iThreadUid)
		{
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

	public function Quota(string $sRootName = '') : ?array
	{
		return $this->oImapClient->Quota($sRootName);
	}

	public function QuotaRoot(string $sFolderName = 'INBOX') : ?array
	{
		return $this->oImapClient->QuotaRoot($sFolderName);
	}

	public function FindMessageUidByMessageId(string $sFolderName, string $sMessageId) : ?int
	{
		if (!\strlen($sMessageId))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aUids = $this->oImapClient->MessageSimpleSearch(
			'HEADER Message-ID '.$sMessageId, true);

		return 1 === \count($aUids) && \is_numeric($aUids[0]) ? (int) $aUids[0] : null;
	}

	public function Folders(string $sParent, string $sListPattern, bool $bUseListSubscribeStatus, int $iOptimizationLimit, bool $bUseListStatus) : ?FolderCollection
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

		$aFolders = $bUseListStatus
			? $this->oImapClient->FolderStatusList($sParent, $sListPattern)
			: $this->oImapClient->FolderList($sParent, $sListPattern);
		if (!$aFolders) {
			return null;
		}

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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderCreate(string $sFolderNameInUtf8, string $sFolderParentFullName = '', bool $bSubscribeOnCreation = true, string $sDelimiter = '') : ?Folder
	{
		$sFolderNameInUtf8 = \trim($sFolderNameInUtf8);
		$sFolderParentFullName = \trim($sFolderParentFullName);

		if (!\strlen($sFolderNameInUtf8))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		if (!\strlen($sDelimiter) || \strlen($sFolderParentFullName))
		{
			$sDelimiter = $this->oImapClient->FolderHierarchyDelimiter($sFolderParentFullName);
			if (null === $sDelimiter)
			{
				// TODO: Translate
				throw new Exceptions\RuntimeException(
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
			throw new Exceptions\RuntimeException(
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderMove(string $sPrevFolderFullName, string $sNextFolderFullNameInUtf, bool $bSubscribeOnMove = true) : self
	{
		if (!$this->oImapClient->FolderHierarchyDelimiter($sPrevFolderFullName)) {
			// TODO: Translate
			throw new Exceptions\RuntimeException('Cannot move non-existent folder.');
		}
		return $this->folderModify($sPrevFolderFullName, $sNextFolderFullNameInUtf, $bSubscribeOnMove);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderRename(string $sPrevFolderFullName, string $sNewTopFolderNameInUtf, bool $bSubscribeOnRename = true) : string
	{
		$sDelimiter = $this->oImapClient->FolderHierarchyDelimiter($sPrevFolderFullName);
		if (!$sDelimiter) {
			// TODO: Translate
			throw new Exceptions\RuntimeException('Cannot rename non-existent folder.');
		}

		if (\strlen($sDelimiter) && false !== \strpos($sNewTopFolderNameInUtf, $sDelimiter)) {
			// TODO: Translate
			throw new Exceptions\RuntimeException('New folder name contains delimiter.');
		}

		$iLast = \strrpos($sPrevFolderFullName, $sDelimiter);
		$sNewFolderFullName = (false === $iLast ? '' : \substr($sPrevFolderFullName, 0, $iLast + 1))
			. $sNewTopFolderNameInUtf;

		$this->folderModify($sPrevFolderFullName, $sNewFolderFullName, $bSubscribeOnRename);

		return $sNewFolderFullName;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Base\Exceptions\RuntimeException
	 */
	protected function folderModify(string $sPrevFolderFullName, string $sNewFolderFullName, bool $bSubscribe) : self
	{
		if (!\strlen($sPrevFolderFullName) || !\strlen($sNewFolderFullName))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$aSubscribeFolders = array();
		if ($bSubscribe)
		{
			$aSubscribeFolders = $this->oImapClient->FolderSubscribeList($sPrevFolderFullName, '*');
			foreach ($aSubscribeFolders as /* @var $oFolder \MailSo\Imap\Folder */ $oFolder)
			{
				$this->oImapClient->FolderUnSubscribe($oFolder->FullName());
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Mail\Exceptions\RuntimeException
	 */
	public function FolderDelete(string $sFolderFullName, bool $bUnsubscribeOnDeletion = true) : self
	{
		if (!\strlen($sFolderFullName) || 'INBOX' === $sFolderFullName)
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderExamine($sFolderFullName);

		$aIndexOrUids = $this->oImapClient->MessageSimpleSearch('ALL');
		if (\count($aIndexOrUids))
		{
			throw new Exceptions\NonEmptyFolder;
		}

		$this->oImapClient->FolderExamine('INBOX');

		if ($bUnsubscribeOnDeletion)
		{
			$this->oImapClient->FolderUnSubscribe($sFolderFullName);
		}

		$this->oImapClient->FolderDelete($sFolderFullName);

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderClear(string $sFolderFullName) : self
	{
		$this->oImapClient->FolderSelect($sFolderFullName);

		$oFolderInformation = $this->oImapClient->FolderCurrentInformation();
		if ($oFolderInformation && 0 < $oFolderInformation->MESSAGES)
		{
			$this->oImapClient->MessageStoreFlag(new SequenceSet('1:*', false),
				array(\MailSo\Imap\Enumerations\MessageFlag::DELETED),
				StoreAction::ADD_FLAGS_SILENT
			);

			$this->oImapClient->FolderExpunge();
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderSubscribe(string $sFolderFullName, bool $bSubscribe) : self
	{
		if (!\strlen($sFolderFullName))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->{$bSubscribe ? 'FolderSubscribe' : 'FolderUnSubscribe'}($sFolderFullName);

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetLogger(\MailSo\Log\Logger $oLogger) : self
	{
		if (!($oLogger instanceof \MailSo\Log\Logger))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oLogger = $oLogger;
		$this->oImapClient->SetLogger($this->oLogger);

		return $this;
	}

	public function GetNamespace() : string
	{
		$oNamespace = $this->oImapClient->GetNamespace();
		return $oNamespace ? $oNamespace->GetPersonalNamespace() : '';
	}

	/**
	 * RFC 5464
	 */

	public function ServerGetMetadata(array $aEntries, array $aOptions = []) : array
	{
		return $this->oImapClient->ServerGetMetadata($aEntries, $aOptions);
	}

	public function FolderGetMetadata(string $sFolderName, array $aEntries, array $aOptions = []) : array
	{
		return $this->oImapClient->FolderGetMetadata($sFolderName, $aEntries, $aOptions);
	}

	public function FolderSetMetadata(string $sFolderName, array $aEntries) : void
	{
		$this->oImapClient->FolderSetMetadata($sFolderName, $aEntries);
	}

	public function FolderDeleteMetadata($sFolderName, array $aEntries) : void
	{
		$this->oImapClient->FolderSetMetadata($sFolderName, \array_fill_keys(\array_keys($aEntries), null));
	}
}
