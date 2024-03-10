<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Exceptions\ClientException;
use RainLoop\Model\Account;
use RainLoop\Notifications;
use MailSo\Imap\SequenceSet;
use MailSo\Imap\Enumerations\FetchType;
use MailSo\Imap\Enumerations\MessageFlag;
use MailSo\Mime\Part as MimePart;
use MailSo\Mime\Enumerations\Header as MimeEnumHeader;

trait Messages
{
	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoMessageList() : array
	{
//		\sleep(1);
//		throw new ClientException(Notifications::CantGetMessageList);
		$oParams = new \MailSo\Mail\MessageListParams;

		$aValues = $this->decodeRawKey($this->GetActionParam('RawKey', ''));
		$sHash = '';
		if ($aValues && 6 < \count($aValues)) {
			// GET
			$sHash = (string) $aValues['hash'];
			$oParams->sFolderName = (string) $aValues['folder'];
			$oParams->iLimit = $aValues['limit'];
			$oParams->iOffset = $aValues['offset'];
			$oParams->sSearch = (string) $aValues['search'];
			$oParams->sSort = (string) $aValues['sort'];
			if (isset($aValues['uidNext'])) {
				$oParams->iPrevUidNext = $aValues['uidNext'];
			}
			$oParams->bUseThreads = !empty($aValues['useThreads']);
			if ($oParams->bUseThreads && isset($aValues['threadUid'])) {
				$oParams->iThreadUid = $aValues['threadUid'];
			}
		} else {
			// POST
			$oParams->sFolderName = $this->GetActionParam('folder', '');
			$oParams->iOffset = $this->GetActionParam('offset', 0);
			$oParams->iLimit = $this->GetActionParam('limit', 10);
			$oParams->sSearch = $this->GetActionParam('search', '');
			$oParams->sSort = $this->GetActionParam('sort', '');
			$oParams->iPrevUidNext = $this->GetActionParam('uidNext', 0);
			$oParams->bUseThreads = !empty($this->GetActionParam('useThreads', '0'));
			if ($oParams->bUseThreads) {
				$oParams->iThreadUid = $this->GetActionParam('threadUid', '');
			}
		}

		if (!\strlen($oParams->sFolderName)) {
			throw new ClientException(Notifications::CantGetMessageList);
		}

		$oAccount = $this->initMailClientConnection();

		if ($sHash) {
//			$sFolderHash = $this->MailClient()->FolderHash($oParams->sFolderName);
			$oInfo = $this->ImapClient()->FolderStatusAndSelect($oParams->sFolderName);
			$aRequestHash = \explode('-', $sHash);
			$sFolderHash = $oInfo->etag;
			$sHash = $oParams->hash() . '-' . $sFolderHash;
			if ($aRequestHash[1] == $sFolderHash) {
				$this->verifyCacheByKey($sHash);
			}
		}

		try
		{
			if ($this->Config()->Get('cache', 'enable', true) && $this->Config()->Get('cache', 'server_uids', false)) {
				$oParams->oCacher = $this->Cacher($oAccount);
			}

//			$oParams->bUseSort = $this->ImapClient()->hasCapability('SORT');
			$oParams->bUseSort = true;

			$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
			if ($oSettingsLocal instanceof \RainLoop\Settings) {
				$oParams->bHideDeleted = !empty($oSettingsLocal->GetConf('HideDeleted', 1));
			}

//			\ignore_user_abort(true);
			$oMessageList = $this->MailClient()->MessageList($oParams);
			if ($sHash) {
				$this->cacheByKey($sHash);
			}
			return $this->DefaultResponse($oMessageList);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantGetMessageList, $oException);
		}
	}

	public function DoSaveMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		$sDraftFolder = $this->GetActionParam('saveFolder', '');
		if (!\strlen($sDraftFolder)) {
			throw new ClientException(Notifications::UnknownError);
		}

		$oMessage = $this->buildMessage($oAccount, true);

		$this->Plugins()->RunHook('filter.save-message', array($oMessage));

		$mResult = false;
		if ($oMessage) {
			$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

			$iMessageStreamSize = \MailSo\Base\Utils::WriteStream($oMessage->ToStream(false), $rMessageStream, 8192, true);

			if (false !== $iMessageStreamSize) {
				$sMessageId = $oMessage->MessageId();

				\rewind($rMessageStream);

				$iNewUid = $this->ImapClient()->MessageAppendStream(
					$sDraftFolder, $rMessageStream, $iMessageStreamSize, array(MessageFlag::SEEN)
				);

				if (!empty($sMessageId) && (null === $iNewUid || 0 === $iNewUid)) {
					$iNewUid = $this->MailClient()->FindMessageUidByMessageId($sDraftFolder, $sMessageId);
				}

				$mResult = true;

				$sMessageFolder = $this->GetActionParam('messageFolder', '');
				$iMessageUid = (int) $this->GetActionParam('messageUid', 0);
				if (\strlen($sMessageFolder) && 0 < $iMessageUid) {
					$this->ImapClient()->MessageDelete($sMessageFolder, new SequenceSet($iMessageUid));
				}

				if (null !== $iNewUid && 0 < $iNewUid) {
					$mResult = array(
						'folder' => $sDraftFolder,
						'uid' => $iNewUid
					);
				}
			}
		}

		return $this->DefaultResponse($mResult);
	}

	public function DoSendMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		$oConfig = $this->Config();

		$sSaveFolder = $this->GetActionParam('saveFolder', '');
		$aDraftInfo = $this->GetActionParam('draftInfo', null);

		$oMessage = $this->buildMessage($oAccount, false);

		$this->Plugins()->RunHook('filter.send-message', array($oMessage));

		$mResult = false;
		try
		{
			if ($oMessage) {
				$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

				$iMessageStreamSize = \MailSo\Base\Utils::WriteStream(
					$oMessage->ToStream(true), $rMessageStream, 8192, true, true
				);

				if (false !== $iMessageStreamSize) {
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream, $iMessageStreamSize, true,
						!empty($this->GetActionParam('dsn', 0)),
						!empty($this->GetActionParam('requireTLS', 0))
					);

					if (\is_array($aDraftInfo) && 3 === \count($aDraftInfo)) {
						$sDraftInfoType = $aDraftInfo[0];
						$iDraftInfoUid = (int) $aDraftInfo[1];
						$sDraftInfoFolder = $aDraftInfo[2];

						try
						{
							switch (\strtolower($sDraftInfoType))
							{
								case 'reply':
								case 'reply-all':
									$this->MailClient()->MessageSetFlag($sDraftInfoFolder, new SequenceSet($iDraftInfoUid), MessageFlag::ANSWERED);
									break;
								case 'forward':
									$this->MailClient()->MessageSetFlag($sDraftInfoFolder, new SequenceSet($iDraftInfoUid), MessageFlag::FORWARDED);
									break;
							}
						}
						catch (\Throwable $oException)
						{
							$this->logException($oException, \LOG_ERR);
						}
					}

					if (\strlen($sSaveFolder)) {
						$rAppendMessageStream = $rMessageStream;
						$iAppendMessageStreamSize = $iMessageStreamSize;
						try
						{
							if ($oMessage->GetBcc()) {
								$rAppendMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();
								$iAppendMessageStreamSize = \MailSo\Base\Utils::WriteStream(
									$oMessage->ToStream(false), $rAppendMessageStream, 8192, true, true
								);
							} else {
								if (\is_resource($rMessageStream)) {
									\rewind($rMessageStream);
								}
							}
						}
						catch (\Throwable $oException)
						{
							$this->logException($oException, \LOG_ERR);
							throw new ClientException(Notifications::CantSaveMessage, $oException);
						}

						try
						{
							$this->Plugins()->RunHook('filter.send-message-stream',
								array($oAccount, &$rAppendMessageStream, &$iAppendMessageStreamSize));
						}
						catch (\Throwable $oException)
						{
							$this->logException($oException, \LOG_ERR);
						}

						try
						{
							$this->ImapClient()->MessageAppendStream(
								$sSaveFolder, $rAppendMessageStream, $iAppendMessageStreamSize,
								array(MessageFlag::SEEN)
							);
						}
						catch (\Throwable $oException)
						{
							// Save folder not the same as default Sent folder, so try again
							$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
							if ($oSettingsLocal instanceof \RainLoop\Settings) {
								$sSentFolder = (string) $oSettingsLocal->GetConf('SentFolder', '');
								if (\strlen($sSentFolder) && $sSentFolder !== $sSaveFolder) {
									$oException = null;
									try
									{
										$this->ImapClient()->MessageAppendStream(
											$sSentFolder, $rAppendMessageStream, $iAppendMessageStreamSize,
											array(MessageFlag::SEEN)
										);
									}
									catch (\Throwable $oException)
									{
									}
								}
							}
							if ($oException) {
								$this->logException($oException, \LOG_ERR);
								throw new ClientException(Notifications::CantSaveMessage, $oException);
							}
						}

						if (\is_resource($rAppendMessageStream) && $rAppendMessageStream !== $rMessageStream) {
							\fclose($rAppendMessageStream);
						}
					}

					if (\is_resource($rMessageStream)) {
						\fclose($rMessageStream);
					}

					$this->deleteMessageAttachments($oAccount);

					$sDraftFolder = $this->GetActionParam('messageFolder', '');
					$iDraftUid = (int) $this->GetActionParam('messageUid', 0);
					if (\strlen($sDraftFolder) && 0 < $iDraftUid) {
						try
						{
							$this->ImapClient()->MessageDelete($sDraftFolder, new SequenceSet($iDraftUid));
						}
						catch (\Throwable $oException)
						{
							$this->logException($oException, \LOG_ERR);
						}
					}

					$mResult = true;
				}
			}
		}
		catch (ClientException $oException)
		{
			throw $oException;
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantSendMessage, $oException);
		}

		if (false === $mResult) {
			throw new ClientException(Notifications::CantSendMessage);
		}

		try
		{
			if ($oMessage && $this->AddressBookProvider($oAccount)->IsActive()) {
				$aArrayToFrec = array();
				$oToCollection = $oMessage->GetTo();
				if ($oToCollection) {
					foreach ($oToCollection as /* @var $oEmail \MailSo\Mime\Email */ $oEmail) {
						$aArrayToFrec[$oEmail->GetEmail(true)] = $oEmail->ToString(false, true);
					}
				}

				if (\count($aArrayToFrec)) {
					$oSettings = $this->SettingsProvider()->Load($oAccount);

					$this->AddressBookProvider($oAccount)->IncFrec(
						\array_values($aArrayToFrec),
						!!$oSettings->GetConf('ContactsAutosave', !!$oConfig->Get('defaults', 'contacts_autosave', true))
					);
				}
			}
		}
		catch (\Throwable $oException)
		{
			$this->logException($oException);
		}

		return $this->TrueResponse();
	}

	public function DoSendReadReceiptMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		$oMessage = $this->buildReadReceiptMessage($oAccount);

		$this->Plugins()->RunHook('filter.send-read-receipt-message', array($oMessage, $oAccount));

		$mResult = false;
		try
		{
			if ($oMessage) {
				$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

				$iMessageStreamSize = \MailSo\Base\Utils::WriteStream(
					$oMessage->ToStream(true), $rMessageStream, 8192, true, true
				);

				if (false !== $iMessageStreamSize) {
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream, $iMessageStreamSize, false);

					if (\is_resource($rMessageStream)) {
						\fclose($rMessageStream);
					}

					$mResult = true;

					$sFolderFullName = $this->GetActionParam('messageFolder', '');
					$iUid = (int) $this->GetActionParam('messageUid', 0);

					if (\strlen($sFolderFullName) && 0 < $iUid) {
						try
						{
							$this->MailClient()->MessageSetFlag($sFolderFullName, new SequenceSet($iUid), MessageFlag::MDNSENT, true, true);
						}
						catch (\Throwable $oException)
						{
							$this->Cacher($oAccount)->Set(\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $sFolderFullName, $iUid), '1');
						}
					}
				}
			}
		}
		catch (ClientException $oException)
		{
			throw $oException;
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantSendMessage, $oException);
		}

		if (false === $mResult) {
			throw new ClientException(Notifications::CantSendMessage);
		}

		return $this->TrueResponse();
	}

	public function DoMessageSetSeen() : array
	{
		return $this->messageSetFlag(MessageFlag::SEEN);
	}

	public function DoMessageSetSeenToAll() : array
	{
		$this->initMailClientConnection();

		$sThreadUids = \trim($this->GetActionParam('threadUids', ''));

		try
		{
			$this->MailClient()->MessageSetFlag(
				$this->GetActionParam('folder', ''),
				empty($sThreadUids) ? new SequenceSet('1:*', false) : new SequenceSet(\explode(',', $sThreadUids)),
				MessageFlag::SEEN,
				!empty($this->GetActionParam('setAction', '0'))
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse();
	}

	public function DoMessageSetFlagged() : array
	{
		return $this->messageSetFlag(MessageFlag::FLAGGED, true);
	}

	public function DoMessageSetKeyword() : array
	{
		return $this->messageSetFlag($this->GetActionParam('keyword', ''), true);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoMessage() : array
	{
		$aValues = $this->decodeRawKey((string) $this->GetActionParam('RawKey', ''));
		if ($aValues && 2 <= \count($aValues)) {
			$sFolder = (string) $aValues[0];
			$iUid = (int) $aValues[1];
//			$useThreads = !empty($aValues[2]);
//			$accountHash = $aValues[3];
		} else {
			$sFolder = $this->GetActionParam('folder', '');
			$iUid = (int) $this->GetActionParam('uid', 0);
		}

		$oAccount = $this->initMailClientConnection();

		try
		{
			$oMessage = $this->MailClient()->Message($sFolder, $iUid, true, $this->Cacher($oAccount));

			$bAutoVerify = $this->Config()->Get('security', 'auto_verify_signatures', false);

			// S/MIME signed. Verify it, so we have the raw mime body to show
			if ($oMessage->smimeSigned && ($bAutoVerify || !$oMessage->smimeSigned['detached'])) try {
				$bOpaque = !$oMessage->smimeSigned['detached'];
				$sBody = $this->ImapClient()->FetchMessagePart(
					$oMessage->Uid,
					$oMessage->smimeSigned['partId']
				);
				$result = (new \SnappyMail\SMime\OpenSSL(''))->verify($sBody, null, $bOpaque);
				if ($result) {
					if ($bOpaque) {
						$oMessage->smimeSigned['body'] = $result['body'];
					}
					$oMessage->smimeSigned['success'] = $result['success'];
				}
			} catch (\Throwable $e) {
				$this->logException($e);
			}

			if ($bAutoVerify && $oMessage->pgpSigned) try {
				$GPG = $this->GnuPG();
				if ($GPG) {
					if ($oMessage->pgpSigned['sigPartId']) {
						$sPartId = $oMessage->pgpSigned['partId'];
						$sSigPartId = $oMessage->pgpSigned['sigPartId'];
						$aParts = [
							FetchType::BODY_PEEK.'['.$sPartId.']',
							// An empty section specification refers to the entire message, including the header.
							// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
							FetchType::BODY_PEEK.'['.$sPartId.'.MIME]',
							FetchType::BODY_PEEK.'['.$sSigPartId.']'
						];
						$oFetchResponse = $this->ImapClient()->Fetch($aParts, $oMessage->Uid, true)[0];
						$sBodyMime = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sPartId.'.MIME]');
						$info = $this->GnuPG()->verify(
							\preg_replace('/\\r?\\n/su', "\r\n",
								$sBodyMime . $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sPartId.']')
							),
							\preg_replace('/[^\x00-\x7F]/', '',
								$oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sSigPartId.']')
							)
						);
					} else {
						// clearsigned text
						$info = $this->GnuPG()->verify($oMessage->sPlain, '');
					}
					if (!empty($info[0]) && 0 == $info[0]['status']) {
						$info = $info[0];
						$oMessage->pgpSigned = [
							'fingerprint' => $info['fingerprint'],
							'success' => true
						];
					}
				}
			} catch (\Throwable $e) {
				$this->logException($e);
			}
/*
			if (!$oMessage->sPlain && !$oMessage->sHtml && !$oMessage->pgpEncrypted && !$oMessage->smimeEncrypted) {
				$aAttachments = $oMessage->Attachments ?: [];
				foreach ($aAttachments as $oAttachment) {
//					\in_array($oAttachment->ContentType(), ['application/vnd.ms-tnef', 'application/ms-tnef'])
					if ('winmail.dat' === \strtolower($oAttachment->FileName())) {
						$sData = $this->ImapClient()->FetchMessagePart(
							$oMessage->Uid,
							$oAttachment->PartID()
						);
						$oTNEF = new \TNEFDecoder\TNEFAttachment;
						$oTNEF->decodeTnef($sData);
						foreach ($oTNEF->getFiles() as $oFile) {
							if (\in_array($oFile->type, ['application/rtf', 'text/rtf'])) {
								$rtf = new \SnappyMail\Rtf\Document($oFile->content);
								$oMessage->setHtml($rtf->toHTML());
							} else {
								// List as attachment?
								$oMapiAttachment = new \MailSo\Mail\Attachment($sFolder, $iUid, BodyStructure);
								$oMessage->Attachments->append($oMapiAttachment);
							}
						}
						break;
					}
				}
			}
*/
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantGetMessage, $oException);
		}

		if ($oMessage) {
			$ETag = $oMessage->ETag($this->getAccountFromToken()->IncLogin());
			$this->verifyCacheByKey($ETag);
			$this->Plugins()->RunHook('filter.result-message', array($oMessage));
			$this->cacheByKey($ETag);
		}

		return $this->DefaultResponse($oMessage);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoMessageDelete() : array
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('folder', '');
		$aUids = \explode(',', (string) $this->GetActionParam('uids', ''));

		try
		{
			$this->ImapClient()->MessageDelete($sFolder, new SequenceSet($aUids), true);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantDeleteMessage, $oException);
		}

		$sHash = $this->MailClient()->FolderHash($sFolder);

		return $this->DefaultResponse($sHash ? array($sFolder, $sHash) : array($sFromFolder));
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoMessageMove() : array
	{
		$this->initMailClientConnection();

		$sFromFolder = $this->GetActionParam('fromFolder', '');
		$sToFolder = $this->GetActionParam('toFolder', '');

		$oUids = new SequenceSet(\explode(',', (string) $this->GetActionParam('uids', '')));

		if (!empty($this->GetActionParam('markAsRead', '0'))) {
			try
			{
				$this->MailClient()->MessageSetFlag($sFromFolder, $oUids, MessageFlag::SEEN);
			}
			catch (\Throwable $oException)
			{
				unset($oException);
			}
		}

		$sLearning = $this->GetActionParam('learning', '');
		if ($sLearning) {
			try
			{
				if ('SPAM' === $sLearning) {
//					$this->MailClient()->MessageSetFlag($sFromFolder, $oUids, '\\junk');
					$this->MailClient()->MessageSetFlag($sFromFolder, $oUids, MessageFlag::JUNK);
					$this->MailClient()->MessageSetFlag($sFromFolder, $oUids, MessageFlag::NOTJUNK, false);
				} else if ('HAM' === $sLearning) {
					$this->MailClient()->MessageSetFlag($sFromFolder, $oUids, MessageFlag::NOTJUNK);
					$this->MailClient()->MessageSetFlag($sFromFolder, $oUids, MessageFlag::JUNK, false);
//					$this->MailClient()->MessageSetFlag($sFromFolder, $oUids, '\\junk', false);
				}
			}
			catch (\Throwable $oException)
			{
				unset($oException);
			}
		}

		try
		{
			$this->ImapClient()->MessageMove($sFromFolder, $sToFolder, $oUids);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantMoveMessage, $oException);
		}

		$sHash = $this->MailClient()->FolderHash($sFromFolder);

		return $this->DefaultResponse($sHash ? array($sFromFolder, $sHash) : array($sFromFolder));
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoMessageCopy() : array
	{
		$this->initMailClientConnection();

		$sToFolder = $this->GetActionParam('toFolder', '');

		try
		{
			$this->ImapClient()->MessageCopy(
				$this->GetActionParam('fromFolder', ''),
				$sToFolder,
				new SequenceSet(\explode(',', (string) $this->GetActionParam('uids', '')))
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantCopyMessage, $oException);
		}

		$sHash = $this->MailClient()->FolderHash($sToFolder);

		return $this->DefaultResponse($sHash ? array($sToFolder, $sHash) : array($sToFolder));
	}

	public function DoMessageUploadAttachments() : array
	{
		$oAccount = $this->initMailClientConnection();

		$mResult = false;
		$self = $this;

		try
		{
			$aAttachments = $this->GetActionParam('attachments', array());
			if (!\is_array($aAttachments)) {
				$aAttachments = [];
			}
			if (\count($aAttachments)) {
				$oFilesProvider = $this->FilesProvider();
				foreach ($aAttachments as $mIndex => $sAttachment) {
					$aAttachments[$mIndex] = false;
					if ($aValues = $this->decodeRawKey($sAttachment)) {
						$sFolder = isset($aValues['folder']) ? (string) $aValues['folder'] : '';
						$iUid = isset($aValues['uid']) ? (int) $aValues['uid'] : 0;
						$sMimeIndex = isset($aValues['mimeIndex']) ? (string) $aValues['mimeIndex'] : '';

						$sTempName = \sha1($sAttachment);
						if (!$oFilesProvider->FileExists($oAccount, $sTempName)) {
							$this->MailClient()->MessageMimeStream(
								function($rResource, $sContentType, $sFileName, $sMimeIndex = '') use ($oAccount, $sTempName, $self, &$aAttachments, $mIndex) {
									if (\is_resource($rResource)) {
										$sContentType =
											$sContentType
											?: \SnappyMail\File\MimeType::fromStream($rResource, $sFileName)
											?: \SnappyMail\File\MimeType::fromFilename($sFileName)
											?: 'application/octet-stream'; // 'text/plain'

										$sTempName .= \SnappyMail\File\MimeType::toExtension($sContentType);

										if ($self->FilesProvider()->PutFile($oAccount, $sTempName, $rResource)) {
											$aAttachments[$mIndex] = [
//												'name' => $sFileName,
												'tempName' => $sTempName,
												'mimeType' => $sContentType
//												'size' => 0
											];
										}
									}
								}, $sFolder, $iUid, $sMimeIndex);
						} else {
							$rResource = $oFilesProvider->GetFile($oAccount, $sTempName);
							$sContentType = \SnappyMail\File\MimeType::fromStream($rResource, $sTempName)
								?: \SnappyMail\File\MimeType::fromFilename($sTempName)
								?: 'application/octet-stream'; // 'text/plain'
							$aAttachments[$mIndex] = [
//								'name' => '',
								'tempName' => $sTempName,
								'mimeType' => $sContentType
//								'size' => $oFilesProvider->FileSize($oAccount, $sTempName)
							];
						}
					}
				}
			}
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse($aAttachments);
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 * @throws \MailSo\Net\Exceptions\ConnectionException
	 */
	private function smtpSendMessage(Account $oAccount, \MailSo\Mime\Message $oMessage,
		/*resource*/ &$rMessageStream, int &$iMessageStreamSize, bool $bAddHiddenRcpt = true,
		bool $bDsn = false, bool $bRequireTLS = false)
	{
		$oRcpt = $oMessage->GetRcpt();
		if (!$oRcpt || !$oRcpt->count()) {
			throw new ClientException(Notifications::InvalidRecipients);
		}

		$this->Plugins()->RunHook('filter.smtp-message-stream',
			array($oAccount, &$rMessageStream, &$iMessageStreamSize));

		$this->Plugins()->RunHook('filter.message-rcpt', array($oAccount, $oRcpt));

		$oSmtpClient = null;
		try
		{
			$oFrom = $oMessage->GetFrom();
			$sFrom = $oFrom instanceof \MailSo\Mime\Email ? $oFrom->GetEmail() : '';
			$sFrom = empty($sFrom) ? $oAccount->Email() : $sFrom;

			$this->Plugins()->RunHook('filter.smtp-from', array($oAccount, $oMessage, &$sFrom));

			$aHiddenRcpt = array();
			if ($bAddHiddenRcpt)
			{
				$this->Plugins()->RunHook('filter.smtp-hidden-rcpt', array($oAccount, $oMessage, &$aHiddenRcpt));
			}

			$oSmtpClient = new \MailSo\Smtp\SmtpClient();
			$oSmtpClient->SetLogger($this->Logger());

			$oAccount->SmtpConnectAndLogin($this->Plugins(), $oSmtpClient);

			if ($oSmtpClient->Settings->usePhpMail) {
				if (\MailSo\Base\Utils::FunctionCallable('mail')) {
					$oToCollection = $oMessage->GetTo();
					if ($oToCollection && $oFrom) {
						$sRawBody = \stream_get_contents($rMessageStream);
						if (!empty($sRawBody)) {
							$sMailTo = \trim($oToCollection->ToString(true));
							$sMailSubject = \trim($oMessage->GetSubject());
							$sMailSubject = \strlen($sMailSubject) ? \MailSo\Base\Utils::EncodeHeaderValue($sMailSubject) : '';

							$sMailHeaders = $sMailBody = '';
							list($sMailHeaders, $sMailBody) = \explode("\r\n\r\n", $sRawBody, 2);
							unset($sRawBody);

							if ($this->Config()->Get('labs', 'mail_func_clear_headers', true)) {
								$sMailHeaders = \MailSo\Base\Utils::RemoveHeaderFromHeaders($sMailHeaders, array(
									MimeEnumHeader::TO_,
									MimeEnumHeader::SUBJECT
								));
							}

							$this->Logger()->WriteDump(array(
								$sMailTo, $sMailSubject, $sMailBody, $sMailHeaders
							), \LOG_DEBUG);

							$bR = $this->Config()->Get('labs', 'mail_func_additional_parameters', false) ?
								\mail($sMailTo, $sMailSubject, $sMailBody, $sMailHeaders, '-f'.$oFrom->GetEmail()) :
								\mail($sMailTo, $sMailSubject, $sMailBody, $sMailHeaders);

							if (!$bR) {
								throw new ClientException(Notifications::CantSendMessage);
							}
						}
					}
				} else {
					throw new ClientException(Notifications::CantSendMessage);
				}
			} else if ($oSmtpClient->IsConnected()) {
				if ($iMessageStreamSize && $oSmtpClient->maxSize() && $iMessageStreamSize * 1.33 > $oSmtpClient->maxSize()) {
					throw new ClientException(Notifications::ClientViewError, 'Message size '. ($iMessageStreamSize * 1.33) . ' bigger then max ' . $oSmtpClient->maxSize());
				}

				if (!empty($sFrom)) {
					$oSmtpClient->MailFrom($sFrom, 0, $bDsn, $bRequireTLS);
				}

				foreach ($oRcpt as /* @var $oEmail \MailSo\Mime\Email */ $oEmail) {
					$oSmtpClient->Rcpt($oEmail->GetEmail(), $bDsn);
				}

				if ($bAddHiddenRcpt && \is_array($aHiddenRcpt) && \count($aHiddenRcpt)) {
					foreach ($aHiddenRcpt as $sEmail) {
						if (\preg_match('/^[^@\s]+@[^@\s]+$/', $sEmail)) {
							$oSmtpClient->Rcpt($sEmail);
						}
					}
				}

				$oSmtpClient->DataWithStream($rMessageStream);

				$oSmtpClient->Disconnect();
			}
		}
		catch (\MailSo\Net\Exceptions\ConnectionException $oException)
		{
			if ($oSmtpClient && $oSmtpClient->Settings->viewErrors) {
				throw new ClientException(Notifications::ClientViewError, $oException);
			}
			throw new ClientException(Notifications::ConnectionError, $oException);
		}
		catch (\MailSo\Smtp\Exceptions\LoginException $oException)
		{
			throw new ClientException(Notifications::AuthError, $oException);
		}
		catch (\Throwable $oException)
		{
			if ($oSmtpClient && $oSmtpClient->Settings->viewErrors) {
				throw new ClientException(Notifications::ClientViewError, $oException);
			}
			throw $oException;
		}
	}

	private function messageSetFlag(string $sMessageFlag, bool $bSkipUnsupportedFlag = false) : array
	{
		$this->initMailClientConnection();

		try
		{
			$this->MailClient()->MessageSetFlag(
				$this->GetActionParam('folder', ''),
				new SequenceSet(\explode(',', (string) $this->GetActionParam('uids', ''))),
				$sMessageFlag,
				!empty($this->GetActionParam('setAction', '0')),
				$bSkipUnsupportedFlag
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse();
	}

	private function deleteMessageAttachments(Account $oAccount) : void
	{
		$aAttachments = $this->GetActionParam('attachments', null);

		if (\is_array($aAttachments)) {
			foreach (\array_keys($aAttachments) as $sTempName) {
				if ($this->FilesProvider()->FileExists($oAccount, $sTempName)) {
					$this->FilesProvider()->Clear($oAccount, $sTempName);
				}
			}
		}
	}

	private function buildReadReceiptMessage(Account $oAccount) : \MailSo\Mime\Message
	{
		$sReadReceipt = $this->GetActionParam('readReceipt', '');
		$sSubject = $this->GetActionParam('subject', '');
		$sText = $this->GetActionParam('plain', '');

		$oIdentity = $this->GetIdentityByID($oAccount, '', true);

		if (empty($sReadReceipt) || empty($sSubject) || empty($sText) || !$oIdentity) {
			throw new ClientException(Notifications::UnknownError);
		}

		$oMessage = new \MailSo\Mime\Message();

		if ($this->Config()->Get('security', 'hide_x_mailer_header', true)) {
			$oMessage->DoesNotAddDefaultXMailer();
		}

		$oMessage->SetFrom(new \MailSo\Mime\Email($oIdentity->Email(), $oIdentity->Name()));

		$oFrom = $oMessage->GetFrom();
		$oMessage->RegenerateMessageId($oFrom ? $oFrom->GetDomain() : '');

		$sReplyTo = $oIdentity->ReplyTo();
		if (!empty($sReplyTo)) {
			$oReplyTo = new \MailSo\Mime\EmailCollection($sReplyTo);
			if ($oReplyTo && $oReplyTo->count()) {
				$oMessage->SetReplyTo($oReplyTo);
			}
		}

		$oMessage->SetSubject($sSubject);

		$oToEmails = new \MailSo\Mime\EmailCollection($sReadReceipt);
		if ($oToEmails && $oToEmails->count()) {
			$oMessage->SetTo($oToEmails);
		}

		$this->Plugins()->RunHook('filter.read-receipt-message-plain', array($oAccount, $oMessage, &$sText));

		$oPart = new MimePart;
		$oPart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'text/plain; charset="utf-8"');
		$oPart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, 'quoted-printable');
		$oPart->Body = \MailSo\Base\StreamWrappers\Binary::CreateStream(
			\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sText))),
			'convert.quoted-printable-encode'
		);
		$oMessage->SubParts->append($oPart);

		$this->Plugins()->RunHook('filter.build-read-receipt-message', array($oMessage, $oAccount));

		return $oMessage;
	}

	/**
	 * called by DoSaveMessage and DoSendMessage
	 */
	private function buildMessage(Account $oAccount, bool $bWithDraftInfo = true) : \MailSo\Mime\Message
	{
		$oMessage = new \MailSo\Mime\Message();

		if ($this->Config()->Get('security', 'hide_x_mailer_header', true)) {
			$oMessage->DoesNotAddDefaultXMailer();
		}

		$oMessage->SetFrom(\MailSo\Mime\Email::Parse($this->GetActionParam('from', '')));
		$oFrom = $oMessage->GetFrom();

/*
		$oIdentity = $this->GetIdentityByID($oAccount, $this->GetActionParam('identityID', ''));
		if ($oIdentity)
		{
			$oMessage->SetFrom(new \MailSo\Mime\Email(
				$oIdentity->Email(), $oIdentity->Name()));
			if ($oAccount->Domain()->OutSetSender()) {
				$oMessage->SetSender(\MailSo\Mime\Email::Parse($oAccount->Email()));
			}
		}
		else
		{
			$oMessage->SetFrom(\MailSo\Mime\Email::Parse($oAccount->Email()));
		}
*/
		$oMessage->RegenerateMessageId($oFrom ? $oFrom->GetDomain() : '');

		$oMessage->SetReplyTo(new \MailSo\Mime\EmailCollection($this->GetActionParam('replyTo', '')));

		if (!empty($this->GetActionParam('readReceiptRequest', 0))) {
			// Read Receipts Reference Main Account Email, Not Identities #147
//			$oMessage->SetReadReceipt(($oIdentity ?: $oAccount)->Email());
			$oMessage->SetReadReceipt($oFrom->GetEmail());
		}

		if (empty($this->GetActionParam('requireTLS', 0))) {
			$oMessage->SetCustomHeader('TLS-Required', 'No');
		}

		if (!empty($this->GetActionParam('markAsImportant', 0))) {
			$oMessage->SetPriority(\MailSo\Mime\Enumerations\MessagePriority::HIGH);
		}

		$oMessage->SetSubject($this->GetActionParam('subject', ''));

		$oMessage->SetTo(new \MailSo\Mime\EmailCollection($this->GetActionParam('to', '')));
		$oMessage->SetCc(new \MailSo\Mime\EmailCollection($this->GetActionParam('cc', '')));
		$oMessage->SetBcc(new \MailSo\Mime\EmailCollection($this->GetActionParam('bcc', '')));

		$aDraftInfo = $this->GetActionParam('draftInfo', null);
		if ($bWithDraftInfo && \is_array($aDraftInfo) && !empty($aDraftInfo[0]) && !empty($aDraftInfo[1]) && !empty($aDraftInfo[2])) {
			$oMessage->SetDraftInfo($aDraftInfo[0], $aDraftInfo[1], $aDraftInfo[2]);
		}

		$oMessage->SetInReplyTo($this->GetActionParam('inReplyTo', ''));
		$oMessage->SetReferences($this->GetActionParam('references', ''));

		$aAutocrypt = $this->GetActionParam('autocrypt', []);
		$oMessage->SetAutocrypt(
			\array_map(fn($header)=>"addr={$header['addr']}; keydata={$header['keydata']}", $aAutocrypt)
		);

		$aFoundCids = array();
		$aFoundDataURL = array();
		$aFoundContentLocationUrls = array();
		$oPart;

		if ($sSigned = $this->GetActionParam('signed', '')) {
			$aSigned = \explode("\r\n\r\n", $sSigned, 2);
//			$sBoundary = \preg_replace('/^.+boundary="([^"]+)".+$/Dsi', '$1', $aSigned[0]);
			$sBoundary = $this->GetActionParam('boundary', '');
//			\preg_match('/protocol="(application/[^"]+)"/', $aSigned[0], $match);
//			$sProtocol = $match[1][0];
			$sProtocol = 'application/pgp-signature';

			$oPart = new MimePart;
			$oPart->Headers->AddByName(
				MimeEnumHeader::CONTENT_TYPE,
				'multipart/signed; micalg="pgp-sha256"; protocol="'.$sProtocol.'"; boundary="'.$sBoundary.'"'
			);
			$oPart->Body = $aSigned[1];
			$oMessage->SubParts->append($oPart);
			$oMessage->SubParts->SetBoundary($sBoundary);

			unset($oAlternativePart);
			unset($sSigned);

		} else if ($sEncrypted = $this->GetActionParam('encrypted', '')) {
			$oMessage->addPgpEncrypted(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sEncrypted)));
			unset($sEncrypted);

		} else if ($sHtml = $this->GetActionParam('html', '')) {
			$oPart = new MimePart;
			$oPart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'multipart/alternative');
			$oMessage->SubParts->append($oPart);

			$sHtml = \MailSo\Base\HtmlUtils::BuildHtml($sHtml, $aFoundCids, $aFoundDataURL, $aFoundContentLocationUrls);

			$aLinkedData = $this->GetActionParam('linkedData', []);
			if ($aLinkedData) {
				$sHtml = \str_replace('</head>', '<script type="application/ld+json">'.\json_encode($aLinkedData).'</script></head>', $sHtml);
			}

			$this->Plugins()->RunHook('filter.message-html', array($oAccount, $oMessage, &$sHtml));

			// First add plain
			$sPlain = $this->GetActionParam('plain', '') ?: \MailSo\Base\HtmlUtils::ConvertHtmlToPlain($sHtml);
			$this->Plugins()->RunHook('filter.message-plain', array($oAccount, $oMessage, &$sPlain));
			$oPart->addPlain($sPlain);
			unset($sPlain);

			// Now add HTML
			$oAlternativePart = new MimePart;
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'text/html; charset=utf-8');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, 'quoted-printable');
			$oAlternativePart->Body = \MailSo\Base\StreamWrappers\Binary::CreateStream(
				\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sHtml))),
				'convert.quoted-printable-encode'
			);
			$oPart->SubParts->append($oAlternativePart);

			unset($oAlternativePart);
			unset($sHtml);

		} else {
			$sPlain = $this->GetActionParam('plain', '');
/*
			if ($sSignature = $this->GetActionParam('pgpSignature', null)) {
				$oPart = new MimePart;
				$oPart->Headers->AddByName(
					MimeEnumHeader::CONTENT_TYPE,
					'multipart/signed; micalg="pgp-sha256"; protocol="application/pgp-signature"'
				);
				$oMessage->SubParts->append($oPart);

				$oAlternativePart = new MimePart;
				$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'text/plain; charset="utf-8"; protected-headers="v1"');
				$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, 'base64');
				$oAlternativePart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sPlain)));
				$oPart->SubParts->append($oAlternativePart);

				$oAlternativePart = new MimePart;
				$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'application/pgp-signature; name="signature.asc"');
				$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, '7Bit');
				$oAlternativePart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sSignature)));
				$oPart->SubParts->append($oAlternativePart);

				unset($sSignature);
			} else {
*/
			$this->Plugins()->RunHook('filter.message-plain', array($oAccount, $oMessage, &$sPlain));
			$oMessage->addPlain($sPlain);
			unset($sPlain);
		}
		unset($oPart);

		$aAttachments = $this->GetActionParam('attachments', null);
		if (\is_array($aAttachments)) {
			foreach ($aAttachments as $sTempName => $aData) {
				$sFileName = (string) $aData['name'];
				$bIsInline = (bool) $aData['inline'];
				$sCID = (string) $aData['cId'];
				$sContentLocation = (string) $aData['location'];
				$sMimeType = (string) $aData['type'];

				$rResource = $this->FilesProvider()->GetFile($oAccount, $sTempName);
				if (\is_resource($rResource)) {
					$iFileSize = $this->FilesProvider()->FileSize($oAccount, $sTempName);

					$oMessage->Attachments()->append(
						new \MailSo\Mime\Attachment($rResource, $sFileName, $iFileSize, $bIsInline,
							\in_array(trim(trim($sCID), '<>'), $aFoundCids),
							$sCID, array(), $sContentLocation, $sMimeType
						)
					);
				}
			}
		}

		foreach ($aFoundDataURL as $sCidHash => $sDataUrlString) {
			$aMatch = array();
			$sCID = '<'.$sCidHash.'>';
			if (\preg_match('/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/i', $sDataUrlString, $aMatch) &&
				!empty($aMatch[1]) && !empty($aMatch[2]))
			{
				$sRaw = \MailSo\Base\Utils::Base64Decode($aMatch[2]);
				$iFileSize = \strlen($sRaw);
				if (0 < $iFileSize) {
					$sFileName = \preg_replace('/[^a-z0-9]+/i', '.', $aMatch[1]);
					$rResource = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($sRaw);

					$sRaw = '';
					unset($sRaw);
					unset($aMatch);

					$oMessage->Attachments()->append(
						new \MailSo\Mime\Attachment($rResource, $sFileName, $iFileSize, true, true, $sCID)
					);
				}
			}
		}

		$oPassphrase = new \SnappyMail\SensitiveString($this->GetActionParam('signPassphrase', ''));

		$sFingerprint = $this->GetActionParam('signFingerprint', '');
		if ($sFingerprint) {
			$GPG = $this->GnuPG();
			$oBody = $oMessage->GetRootPart();
			$resource = $oBody->ToStream();

			\MailSo\Base\StreamFilters\LineEndings::appendTo($resource);
			$fp = \fopen('php://temp', 'r+b');
//			\stream_copy_to_stream($resource, $fp); // Fails
			while (!\feof($resource)) \fwrite($fp, \fread($resource, 8192));

			$oBody->Body = null;
			$oBody->SubParts->Clear();
			$oMessage->SubParts->Clear();
			$oMessage->Attachments()->Clear();

			$GPG->addSignKey($sFingerprint, $oPassphrase);
			$GPG->setsignmode(GNUPG_SIG_MODE_DETACH);
			$sSignature = $GPG->signStream($fp);
			if (!$sSignature) {
				throw new \Exception('GnuPG sign() failed');
			}

			$oPart = new MimePart;
			$oPart->Headers->AddByName(
				MimeEnumHeader::CONTENT_TYPE,
				'multipart/signed; micalg="pgp-sha256"; protocol="application/pgp-signature"'
			);
			$oMessage->SubParts->append($oPart);

			\rewind($fp);
			$oBody->Raw = $fp;
			$oPart->SubParts->append($oBody);

			$oSignaturePart = new MimePart;
			$oSignaturePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'application/pgp-signature; name="signature.asc"');
			$oSignaturePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, '7Bit');
			$oSignaturePart->Body = $sSignature;
			$oPart->SubParts->append($oSignaturePart);
		} else {
			$sCertificate = $this->GetActionParam('signCertificate', '');
			$sPrivateKey = $this->GetActionParam('signPrivateKey', '');
			if ('S/MIME' === $this->GetActionParam('sign', '')) {
				$sID = $this->GetActionParam('identityID', '');
				foreach ($this->GetIdentities($oAccount) as $oIdentity) {
					if ($oIdentity && $oIdentity->smimeCertificate && $oIdentity->smimeKey
					 && ($oIdentity->Id() === $sID || $oIdentity->Email() === $oFrom->GetEmail())
					) {
						$sCertificate = $oIdentity->smimeCertificate;
						$sPrivateKey = $oIdentity->smimeKey;
						break;
					}
				}
			}
			if ($sCertificate && $sPrivateKey) {
				$oBody = $oMessage->GetRootPart();

				$resource = $oBody->ToStream();
				\MailSo\Base\StreamFilters\LineEndings::appendTo($resource);
				$tmp = new \SnappyMail\File\Temporary('mimepart');
				$tmp->writeFromStream($resource);

				$oBody->Body = null;
				$oBody->SubParts->Clear();
				$oMessage->SubParts->Clear();
				$oMessage->Attachments()->Clear();

				$detached = true;

				$SMIME = $this->SMIME();
				$SMIME->setCertificate($sCertificate);
				$SMIME->setPrivateKey($sPrivateKey, $oPassphrase);
				$sSignature = $SMIME->sign($tmp, $detached);

				if (!$sSignature) {
					throw new \RuntimeException('S/MIME sign() failed');
				}

				$oPart = new MimePart;
				$oMessage->SubParts->append($oPart);
				if ($detached) {
					$oPart->Headers->AddByName(
						MimeEnumHeader::CONTENT_TYPE,
						'multipart/signed; micalg="sha-256"; protocol="application/pkcs7-signature"'
					);

					$fp = $tmp->fopen();
					\rewind($fp);
					$oBody->Raw = $fp;
					$oPart->SubParts->append($oBody);

					$oSignaturePart = new MimePart;
					$oSignaturePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'application/pkcs7-signature; name="signature.p7s"');
					$oSignaturePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, 'base64');
					$oSignaturePart->Body = $sSignature;
					$oPart->SubParts->append($oSignaturePart);
				} else {
					$oPart->Headers->AddByName(
						MimeEnumHeader::CONTENT_TYPE,
						'application/pkcs7-mime; smime-type=signed-data; name="smime.p7m"'
					);
					$oPart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, 'base64');
					$oPart->Body = $sSignature;
				}
			}
		}

		$aFingerprints = \json_decode($this->GetActionParam('encryptFingerprints', ''), true);
		if ($aFingerprints) {
			$resource = $oMessage->GetRootPart()->ToStream();
			$fp = \fopen('php://temp', 'r+b');
//			\stream_copy_to_stream($resource, $fp); // Fails
			while (!\feof($resource)) \fwrite($fp, \fread($resource, 8192));

			$oMessage->SubParts->Clear();
			$oMessage->Attachments()->Clear();

			$GPG = $this->GnuPG();
			foreach ($aFingerprints as $sFingerprint) {
				$GPG->addEncryptKey($sFingerprint);
			}
			$oMessage->addPgpEncrypted($GPG->encryptStream($fp));
		} else {
			$aCertificates = $this->GetActionParam('encryptCertificates', []);
			if ($aCertificates) {
				$oBody = $oMessage->GetRootPart();

				$resource = $oBody->ToStream();
				\MailSo\Base\StreamFilters\LineEndings::appendTo($resource);
				$tmp = new \SnappyMail\File\Temporary('mimepart');
				$tmp->writeFromStream($resource);

				$oBody->Body = null;
				$oBody->SubParts->Clear();
				$oMessage->SubParts->Clear();
				$oMessage->Attachments()->Clear();

				$SMIME = $this->SMIME();
				$certificates = $SMIME->certificates();
				// Load certificates by id
				foreach ($aCertificates as &$sCertificate) {
					if (!\str_contains($sCertificate, '-----BEGIN CERTIFICATE-----')) {
						foreach ($certificates as $certificate) {
							if ($certificate['id'] === $sCertificate) {
								$sCertificate = $SMIME->getCertificate($certificate['file']);
							}
						}
					}
				}
				$sEncrypted = $SMIME->encrypt($tmp, $aCertificates);

				$oPart = new MimePart;
				$oMessage->SubParts->append($oPart);
				$oPart->Headers->AddByName(
					MimeEnumHeader::CONTENT_TYPE,
					'application/pkcs7-mime; smime-type=enveloped-data; name="smime.p7m"'
				);
				$oPart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, 'base64');
				$oPart->Body = $sEncrypted;
			}
		}

		$this->Plugins()->RunHook('filter.build-message', array($oMessage));

		return $oMessage;
	}
}
