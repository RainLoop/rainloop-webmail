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

use \MailSo\Imap\Enumerations\FolderResponseStatus;

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

	private function getEnvelopeOrHeadersRequestStringForSimpleList() : string
	{
		return \MailSo\Imap\Enumerations\FetchType::BuildBodyCustomHeaderRequest(array(
			\MailSo\Mime\Enumerations\Header::RETURN_PATH,
			\MailSo\Mime\Enumerations\Header::RECEIVED,
			\MailSo\Mime\Enumerations\Header::MIME_VERSION,
			\MailSo\Mime\Enumerations\Header::FROM_,
			\MailSo\Mime\Enumerations\Header::TO_,
			\MailSo\Mime\Enumerations\Header::CC,
			\MailSo\Mime\Enumerations\Header::SENDER,
			\MailSo\Mime\Enumerations\Header::REPLY_TO,
			\MailSo\Mime\Enumerations\Header::DATE,
			\MailSo\Mime\Enumerations\Header::SUBJECT,
			\MailSo\Mime\Enumerations\Header::CONTENT_TYPE,
			\MailSo\Mime\Enumerations\Header::LIST_UNSUBSCRIBE,
		), true);
	}

	private function getEnvelopeOrHeadersRequestString()
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
			\MailSo\Mime\Enumerations\Header::SENSITIVITY,
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
	public function MessageSetFlagToAll(string $sFolderName, string $sMessageFlag, bool $bSetAction = true, bool $bSkipUnsupportedFlag = false, ?array $aCustomUids = null)
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
			$sStoreAction = $bSetAction
				? \MailSo\Imap\Enumerations\StoreAction::ADD_FLAGS_SILENT
				: \MailSo\Imap\Enumerations\StoreAction::REMOVE_FLAGS_SILENT
			;

			if (\is_array($aCustomUids))
			{
				if (\count($aCustomUids))
				{
					$this->oImapClient->MessageStoreFlag(implode(',', $aCustomUids), true, array($sMessageFlag), $sStoreAction);
				}
			}
			else
			{
				$this->oImapClient->MessageStoreFlag('1:*', false, array($sMessageFlag), $sStoreAction);
			}
		}
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 * @throws \MailSo\Mail\Exceptions\Exception
	 */
	public function MessageSetFlag(string $sFolderName, array $aIndexRange, bool $bIndexIsUid, string $sMessageFlag, bool $bSetAction = true, bool $bSkipUnsupportedFlag = false)
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
			$sStoreAction = $bSetAction
				? \MailSo\Imap\Enumerations\StoreAction::ADD_FLAGS_SILENT
				: \MailSo\Imap\Enumerations\StoreAction::REMOVE_FLAGS_SILENT
			;

			$this->oImapClient->MessageStoreFlag(\MailSo\Base\Utils::PrepareFetchSequence($aIndexRange),
				$bIndexIsUid, array($sMessageFlag), $sStoreAction);
		}
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSetFlagged(string $sFolderName, array $aIndexRange, bool $bIndexIsUid, bool $bSetAction = true, bool $bSkipUnsupportedFlag = false) : void
	{
		$this->MessageSetFlag($sFolderName, $aIndexRange, $bIndexIsUid,
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
	public function MessageSetSeen(string $sFolderName, array $aIndexRange, bool $bIndexIsUid, bool $bSetAction = true) : void
	{
		$this->MessageSetFlag($sFolderName, $aIndexRange, $bIndexIsUid,
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
			array(\MailSo\Imap\Enumerations\FetchType::BODY_PEEK.'['.$sMimeIndex.']',
				function ($sParent, $sLiteralAtomUpperCase, $rImapLiteralStream) use ($mCallback, $sMimeIndex, $sMailEncodingName, $sContentType, $sFileName)
				{
					if (\strlen($sLiteralAtomUpperCase))
					{
						if (\is_resource($rImapLiteralStream) && 'FETCH' === $sParent)
						{
							$rMessageMimeIndexStream = \strlen($sMailEncodingName)
								? \MailSo\Base\StreamWrappers\Binary::CreateStream($rImapLiteralStream,
									\MailSo\Base\StreamWrappers\Binary::GetInlineDecodeOrEncodeFunctionName(
										$sMailEncodingName, true))
								: $rImapLiteralStream;

							\call_user_func($mCallback, $rMessageMimeIndexStream, $sContentType, $sFileName, $sMimeIndex);
						}
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
	public function MessageDelete(string $sFolder, array $aIndexRange, bool $bIndexIsUid, bool $bUseExpunge = true, bool $bExpungeAll = false) : self
	{
		if (!\strlen($sFolder) || !\count($aIndexRange))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFolder);

		$sIndexRange = \MailSo\Base\Utils::PrepareFetchSequence($aIndexRange);

		$this->oImapClient->MessageStoreFlag($sIndexRange, $bIndexIsUid,
			array(\MailSo\Imap\Enumerations\MessageFlag::DELETED),
			\MailSo\Imap\Enumerations\StoreAction::ADD_FLAGS_SILENT
		);

		if ($bUseExpunge)
		{
			$this->oImapClient->MessageExpunge($bIndexIsUid ? $sIndexRange : '', $bIndexIsUid, $bExpungeAll);
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageMove(string $sFromFolder, string $sToFolder, array $aIndexRange, bool $bIndexIsUid, bool $bUseMoveSupported = false, bool $bExpungeAll = false) : self
	{
		if (!$sFromFolder || !$sToFolder || !\count($aIndexRange))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFromFolder);

		if ($bUseMoveSupported && $this->oImapClient->IsSupported('MOVE'))
		{
			$this->oImapClient->MessageMove($sToFolder,
				\MailSo\Base\Utils::PrepareFetchSequence($aIndexRange), $bIndexIsUid);
		}
		else
		{
			$this->oImapClient->MessageCopy($sToFolder,
				\MailSo\Base\Utils::PrepareFetchSequence($aIndexRange), $bIndexIsUid);

			$this->MessageDelete($sFromFolder, $aIndexRange, $bIndexIsUid, true, $bExpungeAll);
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageCopy(string $sFromFolder, string $sToFolder, array $aIndexRange, bool $bIndexIsUid) : self
	{
		if (!$sFromFolder || !$sToFolder || !\count($aIndexRange))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderSelect($sFromFolder);
		$this->oImapClient->MessageCopy($sToFolder,
			\MailSo\Base\Utils::PrepareFetchSequence($aIndexRange), $bIndexIsUid);

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

	protected function initFolderValues(string $sFolderName, int &$iCount, int &$iUnseenCount,
		int &$iUidNext, int &$iHighestModSeq) : void
	{
		$aTypes = array(
			FolderResponseStatus::MESSAGES,
			FolderResponseStatus::UNSEEN,
			FolderResponseStatus::UIDNEXT
		);

		if ($this->oImapClient->IsSupported('CONDSTORE'))
		{
			$aTypes[] = FolderResponseStatus::HIGHESTMODSEQ;
		}

		$aFolderStatus = $this->oImapClient->FolderStatus($sFolderName, $aTypes);

		$iCount = (int) $aFolderStatus[FolderResponseStatus::MESSAGES] ?? 0;

		$iUnseenCount = (int) $aFolderStatus[FolderResponseStatus::UNSEEN] ?? 0;

		$iUidNext = (int) $aFolderStatus[FolderResponseStatus::UIDNEXT] ?? 0;

		if (isset($aFolderStatus[FolderResponseStatus::HIGHESTMODSEQ])) {
			$iHighestModSeq = (int) $aFolderStatus[FolderResponseStatus::HIGHESTMODSEQ];
		} else {
			$iHighestModSeq = 0;
		}
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

	private function getFolderNextMessageInformation(string $sFolderName, int $iPrevUidNext, int $iCurrentUidNext) : array
	{
		$aNewMessages = array();

		if ($iPrevUidNext && $iPrevUidNext != $iCurrentUidNext)
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

					$sCharset = '';
					if (\strlen($sContentTypeCharset))
					{
						$sCharset = $sContentTypeCharset;
					}

					if (\strlen($sCharset))
					{
						$oHeaders->SetParentCharset($sCharset);
					}

					$aNewMessages[] = array(
						'Folder' => $sFolderName,
						'Uid' => $iUid,
						'Subject' => $oHeaders->ValueByName(\MailSo\Mime\Enumerations\Header::SUBJECT, !\strlen($sCharset)),
						'From' => $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::FROM_, !\strlen($sCharset))
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
	public function FolderInformation(string $sFolderName, int $iPrevUidNext = 0, array $aUids = array()) : array
	{
		$aFlags = array();

		if (\count($aUids))
		{
			$this->oImapClient->FolderSelect($sFolderName);

			$aFetchResponse = $this->oImapClient->Fetch(array(
				\MailSo\Imap\Enumerations\FetchType::INDEX,
				\MailSo\Imap\Enumerations\FetchType::UID,
				\MailSo\Imap\Enumerations\FetchType::FLAGS
			), \MailSo\Base\Utils::PrepareFetchSequence($aUids), true);

			foreach ($aFetchResponse as $oFetchResponse)
			{
				$iUid = (int) $oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::UID);
				$aFlags[$iUid] =
					$oFetchResponse->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::FLAGS);
			}
		}

		$iCount = 0;
		$iUnseenCount = 0;
		$iUidNext = 0;
		$iHighestModSeq = 0;

		$this->initFolderValues($sFolderName, $iCount, $iUnseenCount, $iUidNext, $iHighestModSeq);

		return array(
			'Folder' => $sFolderName,
			'Hash' => $this->GenerateFolderHash($sFolderName, $iCount, $iUidNext, $iHighestModSeq),
			'MessageCount' => $iCount,
			'MessageUnseenCount' => $iUnseenCount,
			'UidNext' => $iUidNext,
			'MessageFlags' => $aFlags,
			'HighestModSeq' => $iHighestModSeq,
			'NewMessages' => 'INBOX' === $sFolderName && \MailSo\Config::$CheckNewMessages ?
				$this->getFolderNextMessageInformation($sFolderName, $iPrevUidNext, $iUidNext) : array()
		);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderHash(string $sFolderName) : string
	{
		$iCount = 0;
		$iUnseenCount = 0;
		$iUidNext = 0;
		$iHighestModSeq = 0;

		$this->initFolderValues($sFolderName, $iCount, $iUnseenCount, $iUidNext, $iHighestModSeq);

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

	private function escapeSearchString(string $sSearch) : string
	{
		return !\MailSo\Base\Utils::IsAscii($sSearch)
			? '{'.\strlen($sSearch).'}'."\r\n".$sSearch : $this->oImapClient->EscapeString($sSearch);
	}

	private function parseSearchDate(string $sDate, int $iTimeZoneOffset) : int
	{
		$iResult = 0;
		if (\strlen($sDate))
		{
			$oDateTime = \DateTime::createFromFormat('Y.m.d', $sDate, \MailSo\Base\DateTimeHelper::GetUtcTimeZoneObject());
			return $oDateTime ? $oDateTime->getTimestamp() - $iTimeZoneOffset : 0;
		}

		return $iResult;
	}

	private function parseFriendlySize(string $sSize) : int
	{
		$sSize = preg_replace('/[^0-9bBkKmM]/', '', $sSize);

		$iResult = 0;
		$aMatch = array();

		if (\preg_match('/([\d]+)(B|KB|M|MB|G|GB)$/i', $sSize, $aMatch) && isset($aMatch[1], $aMatch[2]))
		{
			$iResult = (int) $aMatch[1];
			switch (\strtoupper($aMatch[2]))
			{
				case 'K':
				case 'KB':
					$iResult *= 1024;
				case 'M':
				case 'MB':
					$iResult *= 1024;
				case 'G':
				case 'GB':
					$iResult *= 1024;
			}
		}
		else
		{
			$iResult = (int) $sSize;
		}

		return $iResult;
	}

	private function parseSearchString(string $sSearch) : array
	{
		$aResult = array(
			'OTHER' => ''
		);

		$aCache = array();

		$sReg = 'e?mail|from|to|subject|has|is|date|text|body|size|larger|bigger|smaller|maxsize|minsize';

		$sSearch = \MailSo\Base\Utils::StripSpaces($sSearch);
		$sSearch = \trim(\preg_replace('/('.$sReg.'): /i', '\\1:', $sSearch));

		$mMatch = array();
		\preg_match_all('/".*?(?<!\\\)"/', $sSearch, $mMatch);
		if (\is_array($mMatch) && isset($mMatch[0]) && \is_array($mMatch[0]))
		{
			foreach ($mMatch[0] as $sItem)
			{
				do
				{
					$sKey = \MailSo\Base\Utils::Sha1Rand();
				}
				while (isset($aCache[$sKey]));

				$aCache[$sKey] = \stripcslashes($sItem);
				$sSearch = \str_replace($sItem, $sKey, $sSearch);
			}
		}

		\preg_match_all('/\'.*?(?<!\\\)\'/', $sSearch, $mMatch);
		if (\is_array($mMatch) && isset($mMatch[0]) && \is_array($mMatch[0]))
		{
			foreach ($mMatch[0] as $sItem)
			{
				do
				{
					$sKey = \MailSo\Base\Utils::Sha1Rand();
				}
				while (isset($aCache[$sKey]));

				$aCache[$sKey] = \stripcslashes($sItem);
				$sSearch = \str_replace($sItem, $sKey, $sSearch);
			}
		}

		$mMatch = array();
		\preg_match_all('/('.$sReg.'):([^\s]*)/i', $sSearch, $mMatch);
		if (\is_array($mMatch) && isset($mMatch[1]) && \is_array($mMatch[1]) && \count($mMatch[1]))
		{
			if (\is_array($mMatch[0]))
			{
				foreach ($mMatch[0] as $sToken)
				{
					$sSearch = \str_replace($sToken, '', $sSearch);
				}

				$sSearch = \MailSo\Base\Utils::StripSpaces($sSearch);
			}

			foreach ($mMatch[1] as $iIndex => $sName)
			{
				if (isset($mMatch[2][$iIndex]) && \strlen($mMatch[2][$iIndex]))
				{
					$sName = \strtoupper($sName);
					$sValue = $mMatch[2][$iIndex];
					switch ($sName)
					{
						case 'TEXT':
						case 'BODY':
						case 'EMAIL':
						case 'MAIL':
						case 'FROM':
						case 'TO':
						case 'SUBJECT':
						case 'IS':
						case 'HAS':
						case 'SIZE':
						case 'SMALLER':
						case 'LARGER':
						case 'BIGGER':
						case 'MAXSIZE':
						case 'MINSIZE':
						case 'DATE':
							if ('MAIL' === $sName)
							{
								$sName = 'EMAIL';
							}
							if ('BODY' === $sName)
							{
								$sName = 'TEXT';
							}
							if ('SIZE' === $sName || 'BIGGER' === $sName || 'MINSIZE' === $sName)
							{
								$sName = 'LARGER';
							}
							if ('MAXSIZE' === $sName)
							{
								$sName = 'SMALLER';
							}
							$aResult[$sName] = $sValue;
							break;
					}
				}
			}
		}

		$aResult['OTHER'] = $sSearch;
		foreach ($aResult as $sName => $sValue)
		{
			if (isset($aCache[$sValue]))
			{
				$aResult[$sName] = \trim($aCache[$sValue], '"\' ');
			}
		}

		return $aResult;
	}

	private function getImapSearchCriterias(string $sSearch, string $sFilter, int $iTimeZoneOffset = 0, bool &$bUseCache = true) : string
	{
		$bUseCache = true;
		$iTimeFilter = 0;
		$aCriteriasResult = array();

		if (0 < \MailSo\Config::$MessageListDateFilter)
		{
			$iD = \time() - 3600 * 24 * 30 * \MailSo\Config::$MessageListDateFilter;
			$iTimeFilter = \gmmktime(1, 1, 1, \gmdate('n', $iD), 1, \gmdate('Y', $iD));
		}

		if (\strlen(\trim($sSearch)))
		{
			$sResultBodyTextSearch = '';

			$aLines = $this->parseSearchString($sSearch);

			if (1 === \count($aLines) && isset($aLines['OTHER']))
			{
				$sValue = $this->escapeSearchString($aLines['OTHER']);

				if (\MailSo\Config::$MessageListFastSimpleSearch)
				{
					$aCriteriasResult[] = 'OR OR OR';
					$aCriteriasResult[] = 'FROM';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'TO';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'CC';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'SUBJECT';
					$aCriteriasResult[] = $sValue;
				}
				else
				{
					$aCriteriasResult[] = 'TEXT';
					$aCriteriasResult[] = $sValue;
				}
			}
			else
			{
				if (isset($aLines['EMAIL']))
				{
					$sValue = $this->escapeSearchString($aLines['EMAIL']);

					$aCriteriasResult[] = 'OR OR';
					$aCriteriasResult[] = 'FROM';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'TO';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'CC';
					$aCriteriasResult[] = $sValue;

					unset($aLines['EMAIL']);
				}

				if (isset($aLines['TO']))
				{
					$sValue = $this->escapeSearchString($aLines['TO']);

					$aCriteriasResult[] = 'OR';
					$aCriteriasResult[] = 'TO';
					$aCriteriasResult[] = $sValue;
					$aCriteriasResult[] = 'CC';
					$aCriteriasResult[] = $sValue;

					unset($aLines['TO']);
				}

				$sMainText = '';
				foreach ($aLines as $sName => $sRawValue)
				{
					if ('' === \trim($sRawValue))
					{
						continue;
					}

					$sValue = $this->escapeSearchString($sRawValue);
					switch ($sName)
					{
						case 'FROM':
							$aCriteriasResult[] = 'FROM';
							$aCriteriasResult[] = $sValue;
							break;
						case 'SUBJECT':
							$aCriteriasResult[] = 'SUBJECT';
							$aCriteriasResult[] = $sValue;
							break;
						case 'OTHER':
						case 'TEXT':
							$sMainText .= ' '.$sRawValue;
							break;
						case 'HAS':
							$aValue = \explode(',', \strtolower($sRawValue));
							$aValue = \array_map('trim', $aValue);

							$aCompareArray = array('file', 'files', 'attach', 'attachs', 'attachment', 'attachments');
							if (\count($aCompareArray) > \count(\array_diff($aCompareArray, $aValue)))
							{
								// Simple, is not detailed search (Sometimes doesn't work)
								$aCriteriasResult[] = 'OR OR OR';
								$aCriteriasResult[] = 'HEADER Content-Type application/';
								$aCriteriasResult[] = 'HEADER Content-Type multipart/m';
								$aCriteriasResult[] = 'HEADER Content-Type multipart/signed';
								$aCriteriasResult[] = 'HEADER Content-Type multipart/report';
							}

						case 'IS':
							$aValue = \explode(',', \strtolower($sRawValue));
							$aValue = \array_map('trim', $aValue);

							$aCompareArray = array('flag', 'flagged', 'star', 'starred', 'pinned');
							$aCompareArray2 = array('unflag', 'unflagged', 'unstar', 'unstarred', 'unpinned');
							if (\count($aCompareArray) > \count(\array_diff($aCompareArray, $aValue)))
							{
								$aCriteriasResult[] = 'FLAGGED';
								$bUseCache = false;
							}
							else if (\count($aCompareArray2) > \count(\array_diff($aCompareArray2, $aValue)))
							{
								$aCriteriasResult[] = 'UNFLAGGED';
								$bUseCache = false;
							}

							$aCompareArray = array('unread', 'unseen');
							$aCompareArray2 = array('read', 'seen');
							if (\count($aCompareArray) > \count(\array_diff($aCompareArray, $aValue)))
							{
								$aCriteriasResult[] = 'UNSEEN';
								$bUseCache = false;
							}
							else if (\count($aCompareArray2) > \count(\array_diff($aCompareArray2, $aValue)))
							{
								$aCriteriasResult[] = 'SEEN';
								$bUseCache = false;
							}
							break;

						case 'LARGER':
							$aCriteriasResult[] = 'LARGER';
							$aCriteriasResult[] =  $this->parseFriendlySize($sRawValue);
							break;
						case 'SMALLER':
							$aCriteriasResult[] = 'SMALLER';
							$aCriteriasResult[] =  $this->parseFriendlySize($sRawValue);
							break;
						case 'DATE':
							$iDateStampFrom = $iDateStampTo = 0;

							$sDate = $sRawValue;
							$aDate = \explode('/', $sDate);

							if (2 === \count($aDate))
							{
								if (\strlen($aDate[0]))
								{
									$iDateStampFrom = $this->parseSearchDate($aDate[0], $iTimeZoneOffset);
								}

								if (\strlen($aDate[1]))
								{
									$iDateStampTo = $this->parseSearchDate($aDate[1], $iTimeZoneOffset);
									$iDateStampTo += 60 * 60 * 24;
								}
							}
							else
							{
								if (\strlen($sDate))
								{
									$iDateStampFrom = $this->parseSearchDate($sDate, $iTimeZoneOffset);
									$iDateStampTo = $iDateStampFrom + 60 * 60 * 24;
								}
							}

							if (0 < $iDateStampFrom)
							{
								$aCriteriasResult[] = 'SINCE';
								$aCriteriasResult[] = \gmdate('j-M-Y', $iTimeFilter > $iDateStampFrom ?
									$iTimeFilter : $iDateStampFrom);

								$iTimeFilter = 0;
							}

							if (0 < $iDateStampTo)
							{
								$aCriteriasResult[] = 'BEFORE';
								$aCriteriasResult[] = \gmdate('j-M-Y', $iDateStampTo);
							}
							break;
					}
				}

				if ('' !== \trim($sMainText))
				{
					$sMainText = \trim(\MailSo\Base\Utils::StripSpaces($sMainText), '"');
					$sResultBodyTextSearch .= ' '.$sMainText;
				}
			}

			$sResultBodyTextSearch = \trim($sResultBodyTextSearch);
			if (\strlen($sResultBodyTextSearch))
			{
				$aCriteriasResult[] = 'BODY';
				$aCriteriasResult[] = $this->escapeSearchString($sResultBodyTextSearch);
			}
		}

		$sCriteriasResult = \trim(\implode(' ', $aCriteriasResult));

		if (0 < $iTimeFilter)
		{
			$sCriteriasResult .= ' SINCE '.\gmdate('j-M-Y', $iTimeFilter);
		}

		$sCriteriasResult = \trim($sCriteriasResult);
		if (\MailSo\Config::$MessageListUndeletedOnly)
		{
			$sCriteriasResult = \trim($sCriteriasResult.' UNDELETED');
		}

		$sFilter = \trim($sFilter);
		if ('' !== $sFilter)
		{
			$sCriteriasResult .= ' '.$sFilter;
		}

		$sCriteriasResult = \trim($sCriteriasResult);
		if ('' !== \MailSo\Config::$MessageListPermanentFilter)
		{
			$sCriteriasResult = \trim($sCriteriasResult.' '.\MailSo\Config::$MessageListPermanentFilter);
		}

		$sCriteriasResult = \trim($sCriteriasResult);
		if ('' === $sCriteriasResult)
		{
			$sCriteriasResult = 'ALL';
		}

		return $sCriteriasResult;
	}

	private function threadArrayMap(array $aThreads) : array
	{
		$aNew = array();
		foreach ($aThreads as $mItem)
		{
			if (!\is_array($mItem))
			{
				$aNew[] = $mItem;
			}
			else
			{
				$mMap = $this->threadArrayMap($mItem);
				if (\count($mMap))
				{
					$aNew = \array_merge($aNew, $mMap);
				}
			}
		}

		return $aNew;
	}

	private function compileThreadArray(array $aThreads) : array
	{
		$aResult = array();
		foreach ($aThreads as $mItem)
		{
			if (\is_array($mItem))
			{
				$aMap = $this->threadArrayMap($mItem);
				if (1 < \count($aMap))
				{
					$aResult[] = $aMap;
				}
				else if (\count($aMap))
				{
					$aResult[] = $aMap[0];
				}
			}
			else
			{
				$aResult[] = $mItem;
			}
		}

		return $aResult;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageListThreadsMap(string $sFolderName, string $sFolderHash, array $aIndexOrUids, \MailSo\Cache\CacheClient $oCacher, bool $bCacheOnly = false) : array
	{
		$iThreadLimit = \MailSo\Config::$LargeThreadLimit;

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
				'ThreadsMapSorted/'.$sSearchHash.'/'.
				'Limit='.$iThreadLimit.'/'.$sFolderName.'/'.$sFolderHash;

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

		if ($bCacheOnly)
		{
			return null;
		}

		$this->oImapClient->FolderExamine($sFolderName);

		$aThreadUids = array();
		try
		{
			$aThreadUids = $this->oImapClient->MessageSimpleThread($sSearchHash);
		}
		catch (\MailSo\Imap\Exceptions\RuntimeException $oException)
		{
			unset($oException);
			$aThreadUids = array();
		}

		$aResult = array();
		$aCompiledThreads = $this->compileThreadArray($aThreadUids);

		foreach ($aCompiledThreads as $mData)
		{
			if (\is_array($mData))
			{
				foreach ($mData as $mSubData)
				{
					$aResult[(int) $mSubData] =
						\array_diff($mData, array((int) $mSubData));
				}
			}
			else if (\is_int($mData) || \is_string($mData))
			{
				$aResult[(int) $mData] = (int) $mData;
			}
		}

		$aParentsMap = array();
		foreach ($aIndexOrUids as $iUid)
		{
			if (isset($aResult[$iUid]) && \is_array($aResult[$iUid]))
			{
				foreach ($aResult[$iUid] as $iTempUid)
				{
					$aParentsMap[$iTempUid] = $iUid;
					if (isset($aResult[$iTempUid]))
					{
						unset($aResult[$iTempUid]);
					}
				}
			}
		}

		$aSortedThreads = array();
		foreach ($aIndexOrUids as $iUid)
		{
			if (isset($aResult[$iUid]))
			{
				$aSortedThreads[$iUid] = $iUid;
			}
		}

		foreach ($aIndexOrUids as $iUid)
		{
			if (!isset($aSortedThreads[$iUid]) &&
				isset($aParentsMap[$iUid]) &&
				isset($aSortedThreads[$aParentsMap[$iUid]]))
			{
				if (!\is_array($aSortedThreads[$aParentsMap[$iUid]]))
				{
					$aSortedThreads[$aParentsMap[$iUid]] = array();
				}

				$aSortedThreads[$aParentsMap[$iUid]][] = $iUid;
			}
		}

		$aResult = $aSortedThreads;
		unset($aParentsMap, $aSortedThreads);

		$aTemp = array();
		foreach ($aResult as $iUid => $mValue)
		{
			if (0 < $iThreadLimit && \is_array($mValue) && $iThreadLimit < \count($mValue))
			{
				$aParts = \array_chunk($mValue, $iThreadLimit);
				if (0 < count($aParts))
				{
					foreach ($aParts as $iIndex => $aItem)
					{
						if (0 === $iIndex)
						{
							$aResult[$iUid] = $aItem;
						}
						else if (0 < $iIndex && \is_array($aItem))
						{
							$mFirst = \array_shift($aItem);
							if (!empty($mFirst))
							{
								$aTemp[$mFirst] = \count($aItem) ? $aItem : $mFirst;
							}
						}
					}
				}
			}
		}

		foreach ($aTemp as $iUid => $mValue)
		{
			$aResult[$iUid] = $mValue;
		}

		unset($aTemp);

		$aLastResult = array();
		foreach ($aIndexOrUids as $iUid)
		{
			if (isset($aResult[$iUid]))
			{
				$aLastResult[$iUid] = $aResult[$iUid];
			}
		}

		$aResult = $aLastResult;
		unset($aLastResult);

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
	public function MessageListByRequestIndexOrUids(MessageCollection $oMessageCollection, array $aRequestIndexOrUids, bool $bIndexAsUid, bool $bSimple = false)
	{
		if (\count($aRequestIndexOrUids))
		{
			$aFetchResponse = $this->oImapClient->Fetch(array(
				\MailSo\Imap\Enumerations\FetchType::INDEX,
				\MailSo\Imap\Enumerations\FetchType::UID,
				\MailSo\Imap\Enumerations\FetchType::RFC822_SIZE,
				\MailSo\Imap\Enumerations\FetchType::INTERNALDATE,
				\MailSo\Imap\Enumerations\FetchType::FLAGS,
				\MailSo\Imap\Enumerations\FetchType::BODYSTRUCTURE,
				$bSimple ?
					$this->getEnvelopeOrHeadersRequestStringForSimpleList() :
					$this->getEnvelopeOrHeadersRequestString()
			), \MailSo\Base\Utils::PrepareFetchSequence($aRequestIndexOrUids), $bIndexAsUid);

			if (\count($aFetchResponse))
			{
				$aFetchIndexArray = array();
				foreach ($aFetchResponse as /* @var $oFetchResponseItem \MailSo\Imap\FetchResponse */ $oFetchResponseItem)
				{
					$aFetchIndexArray[$bIndexAsUid
						? $oFetchResponseItem->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::UID)
						: $oFetchResponseItem->GetFetchValue(\MailSo\Imap\Enumerations\FetchType::INDEX)
					] = $oFetchResponseItem;
				}

				foreach ($aRequestIndexOrUids as $iFUid)
				{
					if (isset($aFetchIndexArray[$iFUid]))
					{
						$oMessageCollection->append(
							Message::NewFetchResponseInstance(
								$oMessageCollection->FolderName, $aFetchIndexArray[$iFUid]));
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
		string $sFilter, string $sFolderName, string $sFolderHash,
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

		$sSearchCriterias = $this->getImapSearchCriterias($sSearch, $sFilter, 0, $bUseCacheAfterSearch);
		if ($bUseCacheAfterSearch && $oCacher && $oCacher->IsInited())
		{
			$sSerializedHash = 'GetUids/'.
				($bUseSortIfSupported ? 'S' . $sSort : 'N').'/'.
				$this->GenerateImapClientHash().'/'.
				$sFolderName.'/'.$sSearchCriterias;

			$sSerializedLog = '"'.$sFolderName.'" / '.$sSearchCriterias.'';

			$sSerialized = $oCacher->Get($sSerializedHash);
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
			$aResultUids = $bUseSortIfSupported ?
				$this->oImapClient->MessageSimpleSort(array($sSort ?: 'REVERSE DATE'), $sSearchCriterias, true) :
				$this->oImapClient->MessageSimpleSearch($sSearchCriterias, true, \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? '' : 'UTF-8')
			;

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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageList(string $sFolderName, int $iOffset = 0, int $iLimit = 10,
		string $sSearch = '', int $iPrevUidNext = 0, ?\MailSo\Cache\CacheClient $oCacher = null,
		bool $bUseSortIfSupported = false, bool $bUseThreadSortIfSupported = false,
		int $iThreadUid = 0, string $sFilter = '', string $sSort = '') : MessageCollection
	{
		$sFilter = \trim($sFilter);
		$sSearch = \trim($sSearch);
		if (!\MailSo\Base\Validator::RangeInt($iOffset, 0) ||
			!\MailSo\Base\Validator::RangeInt($iLimit, 0, 999))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$bUseFilter = '' !== $sFilter;

		$this->oImapClient->FolderSelect($sFolderName);

		$oMessageCollection = new MessageCollection;
		$oMessageCollection->FolderName = $sFolderName;
		$oMessageCollection->Offset = $iOffset;
		$oMessageCollection->Limit = $iLimit;
		$oMessageCollection->Search = $sSearch;
		$oMessageCollection->ThreadUid = $iThreadUid;
		$oMessageCollection->Filtered = '' !== \MailSo\Config::$MessageListPermanentFilter;

		$aUids = array();
		$mAllSortedUids = null;
		$mAllThreads = null;

		$iMessageRealCount = 0;
		$iMessageUnseenCount = 0;
		$iUidNext = 0;
		$iHighestModSeq = 0;

		$bUseSortIfSupported = $bUseSortIfSupported && $this->oImapClient->IsSupported('SORT');

		$bUseThreadSortIfSupported = $bUseThreadSortIfSupported ?
			($this->oImapClient->IsSupported('THREAD=REFS') || $this->oImapClient->IsSupported('THREAD=REFERENCES') || $this->oImapClient->IsSupported('THREAD=ORDEREDSUBJECT')) : false;

		if ($iThreadUid && !$bUseThreadSortIfSupported)
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		if (!$oCacher || !($oCacher instanceof \MailSo\Cache\CacheClient))
		{
			$oCacher = null;
		}

		$this->initFolderValues($sFolderName, $iMessageRealCount, $iMessageUnseenCount, $iUidNext, $iHighestModSeq);

		if ($bUseFilter)
		{
			$iMessageUnseenCount = 0;
		}

		$oMessageCollection->FolderHash = $this->GenerateFolderHash(
			$sFolderName, $iMessageRealCount, $iUidNext, $iHighestModSeq);

		$oMessageCollection->UidNext = $iUidNext;

		if (!$iThreadUid && $iPrevUidNext && 'INBOX' === $sFolderName)
		{
			$oMessageCollection->NewMessages = $this->getFolderNextMessageInformation(
				$sFolderName, $iPrevUidNext, $iUidNext);
		}

		$bSearch = false;
		$bMessageListOptimization = 0 < \MailSo\Config::$MessageListCountLimitTrigger &&
			\MailSo\Config::$MessageListCountLimitTrigger < $iMessageRealCount;

		if ($bMessageListOptimization)
		{
			$bUseSortIfSupported = false;
			$bUseThreadSortIfSupported = false;
		}

		if (0 < $iMessageRealCount && !$bMessageListOptimization)
		{
			$mAllSortedUids = $this->GetUids($oCacher, '', $sFilter,
				$oMessageCollection->FolderName, $oMessageCollection->FolderHash, $bUseSortIfSupported, $sSort);

			$mAllThreads = $bUseThreadSortIfSupported ? $this->MessageListThreadsMap(
				$oMessageCollection->FolderName, $oMessageCollection->FolderHash, $mAllSortedUids, $oCacher) : null;

			if ($bUseThreadSortIfSupported && 0 < $iThreadUid && \is_array($mAllThreads))
			{
				$iResultRootUid = 0;

				if (isset($mAllThreads[$iThreadUid]))
				{
					$iResultRootUid = $iThreadUid;
					if (\is_array($mAllThreads[$iThreadUid]))
					{
						$aUids = $mAllThreads[$iThreadUid];
					}
				}
				else
				{
					foreach ($mAllThreads as $iRootUid => $mSubUids)
					{
						if (\is_array($mSubUids) && \in_array($iThreadUid, $mSubUids))
						{
							$iResultRootUid = $iRootUid;
							$aUids = $mSubUids;
							continue;
						}
					}
				}

				if (0 < $iResultRootUid && \in_array($iResultRootUid, $mAllSortedUids))
				{
					\array_unshift($aUids, $iResultRootUid);
				}
			}
			else if ($bUseThreadSortIfSupported && \is_array($mAllThreads))
			{
				$aUids = \array_keys($mAllThreads);
			}
			else
			{
				$bUseThreadSortIfSupported = false;
				$aUids = $mAllSortedUids;
			}

			if (\strlen($sSearch) && \is_array($aUids))
			{
				$aSearchedUids = $this->GetUids($oCacher, $sSearch, $sFilter,
					$oMessageCollection->FolderName, $oMessageCollection->FolderHash);

				if (\count($aSearchedUids))
				{
					$aFlippedSearchedUids = \array_flip($aSearchedUids);

					$bSearch = true;
					$aNewUids = array();

					foreach ($aUids as $iUid)
					{
						if (isset($aFlippedSearchedUids[$iUid]))
						{
							$aNewUids[] = $iUid;
						}
						else if ($bUseThreadSortIfSupported && !$iThreadUid && isset($mAllThreads[$iUid]) && \is_array($mAllThreads[$iUid]))
						{
							foreach ($mAllThreads[$iUid] as $iSubUid)
							{
								if (isset($aFlippedSearchedUids[$iSubUid]))
								{
									$aNewUids[] = $iUid;
									continue;
								}
							}
						}
					}

					$aUids = \array_unique($aNewUids);
					unset($aNewUids);
				}
				else
				{
					$aUids = array();
				}
			}

			if (\is_array($aUids))
			{
				$oMessageCollection->MessageCount = $iMessageRealCount;
				$oMessageCollection->MessageUnseenCount = $iMessageUnseenCount;
				$oMessageCollection->MessageResultCount = \count($aUids);

				if (\count($aUids))
				{
					$aRequestUids = \array_slice($aUids, $iOffset, $iLimit);
					$this->MessageListByRequestIndexOrUids($oMessageCollection, $aRequestUids, true);
				}
			}
		}
		else if (0 < $iMessageRealCount)
		{
			if ($this->oLogger)
			{
				$this->oLogger->Write('List optimization (count: '.$iMessageRealCount.
					', limit:'.\MailSo\Config::$MessageListCountLimitTrigger.')');
			}

			$oMessageCollection->MessageCount = $iMessageRealCount;
			$oMessageCollection->MessageUnseenCount = $iMessageUnseenCount;

			if (\strlen($sSearch) || $bUseFilter)
			{
				$aUids = $this->GetUids($oCacher, $sSearch, $sFilter,
					$oMessageCollection->FolderName, $oMessageCollection->FolderHash);

				if (\count($aUids))
				{
					$oMessageCollection->MessageResultCount = \count($aUids);

					$aRequestUids = \array_slice($aUids, $iOffset, $iLimit);
					$this->MessageListByRequestIndexOrUids($oMessageCollection, $aRequestUids, true);
				}
				else
				{
					$oMessageCollection->MessageResultCount = 0;
				}
			}
			else
			{
				$oMessageCollection->MessageResultCount = $iMessageRealCount;

				if (1 < $iMessageRealCount)
				{
					$aRequestIndexes = \array_slice(array_reverse(range(1, $iMessageRealCount)), $iOffset, $iLimit);
				}
				else
				{
					$aRequestIndexes = \array_slice(array(1), $iOffset, $iLimit);
				}

				$this->MessageListByRequestIndexOrUids($oMessageCollection, $aRequestIndexes, false);
			}
		}

		if ($bUseThreadSortIfSupported && 0 === $iThreadUid && \is_array($mAllThreads) && \count($mAllThreads))
		{
			foreach ($oMessageCollection as $oMessage) {
				$iUid = $oMessage->Uid();
				if (isset($mAllThreads[$iUid]) && \is_array($mAllThreads[$iUid]) && \count($mAllThreads[$iUid]))
				{
					$aSubThreads = $mAllThreads[$iUid];
					\array_unshift($aSubThreads, $iUid);

					$oMessage->SetThreads(\array_map('trim', $aSubThreads));
					unset($aSubThreads);
				}
			}
		}

		return $oMessageCollection;
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
			//\error_log('RFC5258 not supported, using LSUB');
			try
			{
				$aSubscribedFolders = $this->oImapClient->FolderSubscribeList($sParent, $sListPattern);
				$aImapSubscribedFoldersHelper = array();
				foreach ($aSubscribedFolders as /* @var $oImapFolder \MailSo\Imap\Folder */ $oImapFolder)
				{
					$aImapSubscribedFoldersHelper[] = $oImapFolder->FullNameRaw();
				}
			}
			catch (\Throwable $oException)
			{
				\error_log('ERROR FolderSubscribeList: ' . $oException->getMessage());
			}
		}

		$bUseListStatus = $bUseListStatus && $this->oImapClient->IsSupported('LIST-STATUS');

		$aFolders = $bUseListStatus
			? $this->oImapClient->FolderStatusList($sParent, $sListPattern)
			: $this->oImapClient->FolderList($sParent, $sListPattern);
		if (!$aFolders) {
			return null;
		}

		$oFolderCollection = new FolderCollection;
		$oFolderCollection->IsMetadataSupported = $this->oImapClient->IsSupported('METADATA');
		$oFolderCollection->IsThreadsSupported = $this->IsThreadsSupported();
		$oFolderCollection->IsSortSupported = $this->oImapClient->IsSupported('SORT');
		$oFolderCollection->IsListStatusSupported = $bUseListStatus;
		$oFolderCollection->Optimized = 10 < $iOptimizationLimit && \count($aFolders) > $iOptimizationLimit;

		$sINBOX = 'INBOX';
		$aSortedByLenImapFolders = array();
		foreach ($aFolders as /* @var $oImapFolder \MailSo\Imap\Folder */ $oImapFolder)
		{
			$oMailFolder = new Folder($oImapFolder,
				($bUseListSubscribeStatus && (null === $aImapSubscribedFoldersHelper || \in_array($oImapFolder->FullNameRaw(), $aImapSubscribedFoldersHelper)))
				|| $oImapFolder->IsInbox()
			);
			if ($oImapFolder->IsInbox()) {
				$sINBOX = $oMailFolder->FullNameRaw();
			}
			$aSortedByLenImapFolders[$oMailFolder->FullNameRaw()] = $oMailFolder;
		}

		// Add NonExistent folders
		$aAddedFolders = array();
		foreach ($aSortedByLenImapFolders as /* @var $oMailFolder Folder */ $oMailFolder)
		{
			$sDelimiter = $oMailFolder->Delimiter();
			$aFolderExplode = \explode($sDelimiter, $oMailFolder->FullNameRaw());

			if (1 < \count($aFolderExplode))
			{
				\array_pop($aFolderExplode);

				$sNonExistentFolderFullNameRaw = '';
				foreach ($aFolderExplode as $sFolderExplodeItem)
				{
					$sNonExistentFolderFullNameRaw .= \strlen($sNonExistentFolderFullNameRaw)
						? $sDelimiter.$sFolderExplodeItem : $sFolderExplodeItem;

					if (!isset($aSortedByLenImapFolders[$sNonExistentFolderFullNameRaw]))
					{
						try
						{
							$aAddedFolders[$sNonExistentFolderFullNameRaw] =
								Folder::NewNonExistentInstance($sNonExistentFolderFullNameRaw, $sDelimiter);
						}
						catch (\Throwable $oExc)
						{
							unset($oExc);
						}
					}
				}
			}
		}

		$aSortedByLenImapFolders = \array_merge($aSortedByLenImapFolders, $aAddedFolders);
		unset($aAddedFolders);

		// Make sure the inbox is the first in list when sorted
		if (isset($aSortedByLenImapFolders[$sINBOX])) {
			$aSortedByLenImapFolders["\x00".$sINBOX] = $aSortedByLenImapFolders[$sINBOX];
			unset($aSortedByLenImapFolders[$sINBOX]);
		}

		\uksort($aSortedByLenImapFolders, 'strnatcasecmp');

		foreach ($aSortedByLenImapFolders as $oMailFolder)
		{
			$oFolderCollection->AddWithPositionSearch($oMailFolder);
		}

		unset($aSortedByLenImapFolders);

		$oNamespace = $this->oImapClient->GetNamespace();
		if ($oNamespace)
		{
			$oFolderCollection->SetNamespace($oNamespace->GetPersonalNamespace());
		}

		return $oFolderCollection;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderCreate(string $sFolderNameInUtf8, string $sFolderParentFullNameRaw = '', bool $bSubscribeOnCreation = true, string $sDelimiter = '') : self
	{
		$sFolderNameInUtf8 = \trim($sFolderNameInUtf8);
		$sFolderParentFullNameRaw = \trim($sFolderParentFullNameRaw);

		if (!\strlen($sFolderNameInUtf8))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		if (!\strlen($sDelimiter) || \strlen($sFolderParentFullNameRaw))
		{
			$sDelimiter = $this->oImapClient->FolderHierarchyDelimiter($sFolderParentFullNameRaw);
			if (null === $sDelimiter)
			{
				// TODO: Translate
				throw new Exceptions\RuntimeException(
					\strlen($sFolderParentFullNameRaw)
						? 'Cannot create folder in non-existent parent folder.'
						: 'Cannot get folder delimiter.');
			}

			if (\strlen($sDelimiter) && \strlen($sFolderParentFullNameRaw))
			{
				$sFolderParentFullNameRaw .= $sDelimiter;
			}
		}

		$sFullNameRawToCreate = \MailSo\Base\Utils::ConvertEncoding($sFolderNameInUtf8,
			\MailSo\Base\Enumerations\Charset::UTF_8,
			\MailSo\Base\Enumerations\Charset::UTF_7_IMAP);

		if (\strlen($sDelimiter) && false !== \strpos($sFullNameRawToCreate, $sDelimiter))
		{
			// TODO: Translate
			throw new Exceptions\RuntimeException(
				'New folder name contains delimiter.');
		}

		$sFullNameRawToCreate = $sFolderParentFullNameRaw.$sFullNameRawToCreate;

		$this->oImapClient->FolderCreate($sFullNameRawToCreate);

		if ($bSubscribeOnCreation)
		{
			$this->oImapClient->FolderSubscribe($sFullNameRawToCreate);
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderMove(string $sPrevFolderFullNameRaw, string $sNextFolderFullNameInUtf, bool $bSubscribeOnMove = true) : self
	{
		return $this->folderModify($sPrevFolderFullNameRaw, $sNextFolderFullNameInUtf, false, $bSubscribeOnMove);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderRename(string $sPrevFolderFullNameRaw, string $sNewTopFolderNameInUtf, bool $bSubscribeOnRename = true) : self
	{
		return $this->folderModify($sPrevFolderFullNameRaw, $sNewTopFolderNameInUtf, true, $bSubscribeOnRename);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Base\Exceptions\RuntimeException
	 */
	protected function folderModify(string $sPrevFolderFullNameRaw, string $sNextFolderNameInUtf, bool $bRename, bool $bSubscribeOnModify) : self
	{
		if (!\strlen($sPrevFolderFullNameRaw) || !\strlen($sNextFolderNameInUtf))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$sDelimiter = $this->oImapClient->FolderHierarchyDelimiter($sPrevFolderFullNameRaw);
		if (!$sDelimiter)
		{
			// TODO: Translate
			throw new Exceptions\RuntimeException('Cannot '.($bRename?'rename':'move').' non-existent folder.');
		}

		$iLast = \strrpos($sPrevFolderFullNameRaw, $sDelimiter);

		$aSubscribeFolders = array();
		if ($bSubscribeOnModify)
		{
			$aSubscribeFolders = $this->oImapClient->FolderSubscribeList($sPrevFolderFullNameRaw, '*');
			foreach ($aSubscribeFolders as /* @var $oFolder \MailSo\Imap\Folder */ $oFolder)
			{
				$this->oImapClient->FolderUnSubscribe($oFolder->FullNameRaw());
			}
		}

		$sNewFolderFullNameRaw = \MailSo\Base\Utils::ConvertEncoding($sNextFolderNameInUtf,
			\MailSo\Base\Enumerations\Charset::UTF_8,
			\MailSo\Base\Enumerations\Charset::UTF_7_IMAP);

		if ($bRename)
		{
			if (\strlen($sDelimiter) && false !== \strpos($sNewFolderFullNameRaw, $sDelimiter))
			{
				// TODO: Translate
				throw new Exceptions\RuntimeException('New folder name contains delimiter.');
			}

			$sFolderParentFullNameRaw = false === $iLast ? '' : \substr($sPrevFolderFullNameRaw, 0, $iLast + 1);
			$sNewFolderFullNameRaw = $sFolderParentFullNameRaw.$sNewFolderFullNameRaw;
		}

		$this->oImapClient->FolderRename($sPrevFolderFullNameRaw, $sNewFolderFullNameRaw);

		foreach ($aSubscribeFolders as /* @var $oFolder \MailSo\Imap\Folder */ $oFolder)
		{
			$sFolderFullNameRawForResubscrine = $oFolder->FullNameRaw();
			if (0 === \strpos($sFolderFullNameRawForResubscrine, $sPrevFolderFullNameRaw))
			{
				$sNewFolderFullNameRawForResubscrine = $sNewFolderFullNameRaw.
					\substr($sFolderFullNameRawForResubscrine, \strlen($sPrevFolderFullNameRaw));

				$this->oImapClient->FolderSubscribe($sNewFolderFullNameRawForResubscrine);
			}
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Mail\Exceptions\RuntimeException
	 */
	public function FolderDelete(string $sFolderFullNameRaw, bool $bUnsubscribeOnDeletion = true) : self
	{
		if (!\strlen($sFolderFullNameRaw) || 'INBOX' === $sFolderFullNameRaw)
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->FolderExamine($sFolderFullNameRaw);

		$aIndexOrUids = $this->oImapClient->MessageSimpleSearch('ALL');
		if (\count($aIndexOrUids))
		{
			throw new Exceptions\NonEmptyFolder;
		}

		$this->oImapClient->FolderExamine('INBOX');

		if ($bUnsubscribeOnDeletion)
		{
			$this->oImapClient->FolderUnSubscribe($sFolderFullNameRaw);
		}

		$this->oImapClient->FolderDelete($sFolderFullNameRaw);

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderClear(string $sFolderFullNameRaw) : self
	{
		$this->oImapClient->FolderSelect($sFolderFullNameRaw);

		$oFolderInformation = $this->oImapClient->FolderCurrentInformation();
		if ($oFolderInformation && 0 < $oFolderInformation->MESSAGES)
		{
			$this->oImapClient->MessageStoreFlag('1:*', false,
				array(\MailSo\Imap\Enumerations\MessageFlag::DELETED),
				\MailSo\Imap\Enumerations\StoreAction::ADD_FLAGS_SILENT
			);

			$this->oImapClient->MessageExpunge();
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function FolderSubscribe(string $sFolderFullNameRaw, bool $bSubscribe) : self
	{
		if (!\strlen($sFolderFullNameRaw))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oImapClient->{($bSubscribe) ? 'FolderSubscribe' : 'FolderUnSubscribe'}($sFolderFullNameRaw);

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
