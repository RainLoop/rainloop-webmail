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

//			$oParams->bUseSort = $this->ImapClient->hasCapability('SORT');
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

		$sSentFolder = $this->GetActionParam('saveFolder', '');
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
					$bDsn = !empty($this->GetActionParam('dsn', 0));
					$bRequireTLS = !empty($this->GetActionParam('requireTLS', 0));
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream, $iMessageStreamSize, true, $bDsn, $bRequireTLS);

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

					if (\strlen($sSentFolder)) {
						try
						{
							if (!$oMessage->GetBcc()) {
								if (\is_resource($rMessageStream)) {
									\rewind($rMessageStream);
								}

								$this->Plugins()->RunHook('filter.send-message-stream',
									array($oAccount, &$rMessageStream, &$iMessageStreamSize));

								$this->ImapClient()->MessageAppendStream(
									$sSentFolder, $rMessageStream, $iMessageStreamSize, array(MessageFlag::SEEN)
								);
							} else {
								$rAppendMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

								$iAppendMessageStreamSize = \MailSo\Base\Utils::WriteStream(
									$oMessage->ToStream(false), $rAppendMessageStream, 8192, true, true
								);

								$this->Plugins()->RunHook('filter.send-message-stream',
									array($oAccount, &$rAppendMessageStream, &$iAppendMessageStreamSize));

								$this->ImapClient()->MessageAppendStream(
									$sSentFolder, $rAppendMessageStream, $iAppendMessageStreamSize, array(MessageFlag::SEEN)
								);

								if (\is_resource($rAppendMessageStream)) {
									fclose($rAppendMessageStream);
								}
							}
						}
						catch (\Throwable $oException)
						{
							throw new ClientException(Notifications::CantSaveMessage, $oException);
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

					$this->Cacher($oAccount)->Set(\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $sFolderFullName, $iUid), '1');

					if (\strlen($sFolderFullName) && 0 < $iUid) {
						try
						{
							$this->MailClient()->MessageSetFlag($sFolderFullName, new SequenceSet($iUid), MessageFlag::MDNSENT, true, true);
						}
						catch (\Throwable $oException) {}
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

//										$sFileName = $self->MainClearFileName($sFileName, $sContentType, $sMimeIndex);
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
//								'name' => $sFileName,
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
	 * https://datatracker.ietf.org/doc/html/rfc3156#section-5
	 */
	public function DoMessagePgpVerify() : array
	{
		$sFolderName = $this->GetActionParam('folder', '');
		$iUid = (int) $this->GetActionParam('uid', 0);
		$sBodyPart = $this->GetActionParam('bodyPart', '');
		$sSigPart = $this->GetActionParam('sigPart', '');
		if ($sBodyPart) {
			$result = [
				'text' => \preg_replace('/\\r?\\n/su', "\r\n", $sBodyPart),
				'signature' => $this->GetActionParam('sigPart', '')
			];
		} else {
			$sBodyPartId = $this->GetActionParam('bodyPartId', '');
			$sSigPartId = $this->GetActionParam('sigPartId', '');
//			$sMicAlg = $this->GetActionParam('micAlg', '');

			$oAccount = $this->initMailClientConnection();

			$oImapClient = $this->ImapClient();
			$oImapClient->FolderExamine($sFolderName);

			$aParts = [
				FetchType::BODY_PEEK.'['.$sBodyPartId.']',
				// An empty section specification refers to the entire message, including the header.
				// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
				FetchType::BODY_PEEK.'['.$sBodyPartId.'.MIME]'
			];
			if ($sSigPartId) {
				$aParts[] = FetchType::BODY_PEEK.'['.$sSigPartId.']';
			}

			$oFetchResponse = $oImapClient->Fetch($aParts, $iUid, true)[0];

			$sBodyMime = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sBodyPartId.'.MIME]');
			if ($sSigPartId) {
				$result = [
					'text' => \preg_replace('/\\r?\\n/su', "\r\n",
						$sBodyMime . $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sBodyPartId.']')
					),
					'signature' => preg_replace('/[^\x00-\x7F]/', '',
						$oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sSigPartId.']')
					)
				];
			} else {
				// clearsigned text
				$result = [
					'text' => $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sBodyPartId.']'),
					'signature' => ''
				];
				$decode = (new \MailSo\Mime\HeaderCollection($sBodyMime))->ValueByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING);
				if ('base64' === $decode) {
					$result['text'] = \base64_decode($result['text']);
				} else if ('quoted-printable' === $decode) {
					$result['text'] = \quoted_printable_decode($result['text']);
				}
			}
		}

		// Try by default as OpenPGP.js sets useGnuPG to 0
		if ($this->GetActionParam('tryGnuPG', 1)) {
			$GPG = $this->GnuPG();
			if ($GPG) {
				$info = $this->GnuPG()->verify($result['text'], $result['signature']);
//				$info = $this->GnuPG()->verifyStream($fp, $result['signature']);
				if (empty($info[0])) {
					$result = false;
				} else {
					$info = $info[0];

					/**
					* https://code.woboq.org/qt5/include/gpg-error.h.html
					* status:
						0 = GPG_ERR_NO_ERROR
						1 = GPG_ERR_GENERAL
						9 = GPG_ERR_NO_PUBKEY
						117440513 = General error
						117440520 = Bad signature
					*/

					$summary = \defined('GNUPG_SIGSUM_VALID') ? [
						GNUPG_SIGSUM_VALID => 'The signature is fully valid.',
						GNUPG_SIGSUM_GREEN => 'The signature is good but one might want to display some extra information. Check the other bits.',
						GNUPG_SIGSUM_RED => 'The signature is bad. It might be useful to check other bits and display more information, i.e. a revoked certificate might not render a signature invalid when the message was received prior to the cause for the revocation.',
						GNUPG_SIGSUM_KEY_REVOKED => 'The key or at least one certificate has been revoked.',
						GNUPG_SIGSUM_KEY_EXPIRED => 'The key or one of the certificates has expired. It is probably a good idea to display the date of the expiration.',
						GNUPG_SIGSUM_SIG_EXPIRED => 'The signature has expired.',
						GNUPG_SIGSUM_KEY_MISSING => 'Can’t verify due to a missing key or certificate.',
						GNUPG_SIGSUM_CRL_MISSING => 'The CRL (or an equivalent mechanism) is not available.',
						GNUPG_SIGSUM_CRL_TOO_OLD => 'Available CRL is too old.',
						GNUPG_SIGSUM_BAD_POLICY => 'A policy requirement was not met.',
						GNUPG_SIGSUM_SYS_ERROR => 'A system error occurred.',
//						GNUPG_SIGSUM_TOFU_CONFLICT = 'A TOFU conflict was detected.',
					] : [];

					// Verified, so no need to return $result['text'] and $result['signature']
					$result = [
						'fingerprint' => $info['fingerprint'],
						'validity' => $info['validity'],
						'status' => $info['status'],
						'summary' => $info['summary'],
						'message' => \implode("\n", \array_filter($summary, function($k) use ($info) {
							return $info['summary'] & $k;
						}, ARRAY_FILTER_USE_KEY))
					];
				}
			} else {
				$result = false;
			}
		}

		return $this->DefaultResponse($result);
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
					$aToCollection = $oMessage->GetTo();
					if ($aToCollection && $oFrom) {
						$sRawBody = \stream_get_contents($rMessageStream);
						if (!empty($sRawBody)) {
							$sMailTo = \trim($aToCollection->ToString(true));
							$sMailSubject = \trim($oMessage->GetSubject());
							$sMailSubject = 0 === \strlen($sMailSubject) ? '' : \MailSo\Base\Utils::EncodeUnencodedValue(
								\MailSo\Base\Enumerations\Encoding::BASE64_SHORT, $sMailSubject);

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
		} else {
			$oMessage->SetXMailer('SnappyMail/'.APP_VERSION);
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

	private function buildMessage(Account $oAccount, bool $bWithDraftInfo = true) : \MailSo\Mime\Message
	{
		$oMessage = new \MailSo\Mime\Message();

		if ($this->Config()->Get('security', 'hide_x_mailer_header', true)) {
			$oMessage->DoesNotAddDefaultXMailer();
		} else {
			$oMessage->SetXMailer('SnappyMail/'.APP_VERSION);
		}

		$sFrom = $this->GetActionParam('from', '');
		$oMessage->SetFrom(\MailSo\Mime\Email::Parse($sFrom));
/*
		$oFromIdentity = $this->GetIdentityByID($oAccount, $this->GetActionParam('identityID', ''));
		if ($oFromIdentity)
		{
			$oMessage->SetFrom(new \MailSo\Mime\Email(
				$oFromIdentity->Email(), $oFromIdentity->Name()));
			if ($oAccount->Domain()->OutSetSender()) {
				$oMessage->SetSender(\MailSo\Mime\Email::Parse($oAccount->Email()));
			}
		}
		else
		{
			$oMessage->SetFrom(\MailSo\Mime\Email::Parse($oAccount->Email()));
		}
*/
		$oFrom = $oMessage->GetFrom();
		$oMessage->RegenerateMessageId($oFrom ? $oFrom->GetDomain() : '');

		$oMessage->SetReplyTo(new \MailSo\Mime\EmailCollection($this->GetActionParam('replyTo', '')));

		if (!empty($this->GetActionParam('readReceiptRequest', 0))) {
			// Read Receipts Reference Main Account Email, Not Identities #147
//			$oMessage->SetReadReceipt(($oFromIdentity ?: $oAccount)->Email());
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

		$aFoundCids = array();
		$aFoundDataURL = array();
		$aFoundContentLocationUrls = array();
		$oPart;

		if ($sSigned = $this->GetActionParam('signed', '')) {
			$aSigned = \explode("\r\n\r\n", $sSigned, 2);
//			$sBoundary = \preg_replace('/^.+boundary="([^"]+)".+$/Dsi', '$1', $aSigned[0]);
			$sBoundary = $this->GetActionParam('boundary', '');

			$oPart = new MimePart;
			$oPart->Headers->AddByName(
				MimeEnumHeader::CONTENT_TYPE,
				'multipart/signed; micalg="pgp-sha256"; protocol="application/pgp-signature"; boundary="'.$sBoundary.'"'
			);
			$oPart->Body = $aSigned[1];
			$oMessage->SubParts->append($oPart);
			$oMessage->SubParts->SetBoundary($sBoundary);

			unset($oAlternativePart);
			unset($sSigned);

		} else if ($sEncrypted = $this->GetActionParam('encrypted', '')) {
			$oPart = new MimePart;
			$oPart->Headers->AddByName(
				MimeEnumHeader::CONTENT_TYPE,
				'multipart/encrypted; protocol="application/pgp-encrypted"'
			);
			$oMessage->SubParts->append($oPart);

			$oAlternativePart = new MimePart;
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'application/pgp-encrypted');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_DISPOSITION, 'attachment');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, '7Bit');
			$oAlternativePart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString('Version: 1');
			$oPart->SubParts->append($oAlternativePart);

			$oAlternativePart = new MimePart;
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'application/octet-stream');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_DISPOSITION, 'inline; filename="msg.asc"');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, '7Bit');
			$oAlternativePart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sEncrypted)));
			$oPart->SubParts->append($oAlternativePart);

			unset($oAlternativePart);
			unset($sEncrypted);

		} else if ($sHtml = $this->GetActionParam('html', '')) {
			$oPart = new MimePart;
			$oPart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'multipart/alternative');
			$oMessage->SubParts->append($oPart);

			$sHtml = \MailSo\Base\HtmlUtils::BuildHtml($sHtml, $aFoundCids, $aFoundDataURL, $aFoundContentLocationUrls);
			$this->Plugins()->RunHook('filter.message-html', array($oAccount, $oMessage, &$sHtml));

			// First add plain
			$sPlain = $this->GetActionParam('plain', '') ?: \MailSo\Base\HtmlUtils::ConvertHtmlToPlain($sHtml);
			$this->Plugins()->RunHook('filter.message-plain', array($oAccount, $oMessage, &$sPlain));
			$oAlternativePart = new MimePart;
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'text/plain; charset=utf-8');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, 'quoted-printable');
			$oAlternativePart->Body = \MailSo\Base\StreamWrappers\Binary::CreateStream(
				\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sPlain))),
				'convert.quoted-printable-encode'
			);
			$oPart->SubParts->append($oAlternativePart);
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
			$oAlternativePart = new MimePart;
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'text/plain; charset="utf-8"');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, 'quoted-printable');
			$oAlternativePart->Body = \MailSo\Base\StreamWrappers\Binary::CreateStream(
				\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sPlain))),
				'convert.quoted-printable-encode'
			);
			$oMessage->SubParts->append($oAlternativePart);
			unset($oAlternativePart);
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

		$sFingerprint = $this->GetActionParam('signFingerprint', '');
		$sPassphrase = $this->GetActionParam('signPassphrase', '');
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

			$GPG->addSignKey($sFingerprint, $sPassphrase);
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
		}

		$aFingerprints = \json_decode($this->GetActionParam('encryptFingerprints', ''), true);
		if ($aFingerprints) {
			$GPG = $this->GnuPG();
			$oBody = $oMessage->GetRootPart();
			$resource = $oBody->ToStream();
			$fp = \fopen('php://temp', 'r+b');
//			\stream_copy_to_stream($resource, $fp); // Fails
			while (!\feof($resource)) \fwrite($fp, \fread($resource, 8192));

			$oMessage->SubParts->Clear();
			$oMessage->Attachments()->Clear();

			foreach ($aFingerprints as $sFingerprint) {
				$GPG->addEncryptKey($sFingerprint);
			}
			$sEncrypted = $GPG->encryptStream($fp);

			$oPart = new MimePart;
			$oPart->Headers->AddByName(
				MimeEnumHeader::CONTENT_TYPE,
				'multipart/encrypted; protocol="application/pgp-encrypted"'
			);
			$oMessage->SubParts->append($oPart);

			$oAlternativePart = new MimePart;
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'application/pgp-encrypted');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_DISPOSITION, 'attachment');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, '7Bit');
			$oAlternativePart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString('Version: 1');
			$oPart->SubParts->append($oAlternativePart);

			$oAlternativePart = new MimePart;
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TYPE, 'application/octet-stream');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_DISPOSITION, 'inline; filename="msg.asc"');
			$oAlternativePart->Headers->AddByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING, '7Bit');
			$oAlternativePart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($sEncrypted);
			$oPart->SubParts->append($oAlternativePart);
		}

		$this->Plugins()->RunHook('filter.build-message', array($oMessage));

		return $oMessage;
	}
}
