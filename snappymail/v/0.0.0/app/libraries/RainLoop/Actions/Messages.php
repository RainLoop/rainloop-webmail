<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\Notifications;

trait Messages
{
	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageList() : array
	{
//		\sleep(1);
//		throw new ClientException(Notifications::CantGetMessageList);

		$sFolder = '';
		$iOffset = 0;
		$iLimit = 20;
		$sSearch = '';
		$sUidNext = '';
		$bUseThreads = false;
		$sThreadUid = '';

		$sRawKey = $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedClientRawKeyValue($sRawKey, 9);

		if ($aValues && 7 < \count($aValues))
		{
			$sFolder =(string) $aValues[0];
			$iOffset = (int) $aValues[1];
			$iLimit = (int) $aValues[2];
			$sSearch = (string) $aValues[3];
			$sUidNext = (string) $aValues[6];
			$bUseThreads = (bool) $aValues[7];

			if ($bUseThreads)
			{
				$sThreadUid = isset($aValues[8]) ? (string) $aValues[8] : '';
			}

			$this->verifyCacheByKey($sRawKey);
		}
		else
		{
			$sFolder = $this->GetActionParam('Folder', '');
			$iOffset = (int) $this->GetActionParam('Offset', 0);
			$iLimit = (int) $this->GetActionParam('Limit', 10);
			$sSearch = $this->GetActionParam('Search', '');
			$sUidNext = $this->GetActionParam('UidNext', '');
			$bUseThreads = '1' === (string) $this->GetActionParam('UseThreads', '0');

			if ($bUseThreads)
			{
				$sThreadUid = (string) $this->GetActionParam('ThreadUid', '');
			}
		}

		if (0 === strlen($sFolder))
		{
			throw new ClientException(Notifications::CantGetMessageList);
		}

		$this->initMailClientConnection();

		try
		{
			if (!$this->Config()->Get('labs', 'use_imap_thread', false))
			{
				$bUseThreads = false;
			}

			$oMessageList = $this->MailClient()->MessageList(
				$sFolder, $iOffset, $iLimit, $sSearch, $sUidNext,
				$this->cacherForUids(),
				!!$this->Config()->Get('labs', 'use_imap_sort', false),
				$bUseThreads,
				$sThreadUid,
				''
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantGetMessageList, $oException);
		}

		if ($oMessageList)
		{
			$this->cacheByKey($sRawKey);
		}

		return $this->DefaultResponse(__FUNCTION__, $oMessageList);
	}

	public function DoSaveMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sMessageFolder = $this->GetActionParam('MessageFolder', '');
		$sMessageUid = $this->GetActionParam('MessageUid', '');

		$sDraftFolder = $this->GetActionParam('SaveFolder', '');
		if (0 === strlen($sDraftFolder))
		{
			throw new ClientException(Notifications::UnknownError);
		}

		$oMessage = $this->buildMessage($oAccount, true);

		$this->Plugins()->RunHook('filter.save-message', array($oMessage));

		$mResult = false;
		if ($oMessage)
		{
			$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

			$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
				$oMessage->ToStream(false), array($rMessageStream), 8192, true, true);

			if (false !== $iMessageStreamSize)
			{
				$sMessageId = $oMessage->MessageId();

				\rewind($rMessageStream);

				$iNewUid = 0;
				$this->MailClient()->MessageAppendStream(
					$rMessageStream, $iMessageStreamSize, $sDraftFolder, array(
						\MailSo\Imap\Enumerations\MessageFlag::SEEN
					), $iNewUid);

				if (!empty($sMessageId) && (null === $iNewUid || 0 === $iNewUid))
				{
					$iNewUid = $this->MailClient()->FindMessageUidByMessageId($sDraftFolder, $sMessageId);
				}

				$mResult = true;

				if (0 < strlen($sMessageFolder) && 0 < strlen($sMessageUid))
				{
					$this->MailClient()->MessageDelete($sMessageFolder, array($sMessageUid), true, true);
				}

				if (null !== $iNewUid && 0 < $iNewUid)
				{
					$mResult = array(
						'NewFolder' => $sDraftFolder,
						'NewUid' => $iNewUid
					);
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	public function DoSendMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oConfig = $this->Config();

		$sDraftFolder = $this->GetActionParam('MessageFolder', '');
		$sDraftUid = $this->GetActionParam('MessageUid', '');
		$sSentFolder = $this->GetActionParam('SaveFolder', '');
		$aDraftInfo = $this->GetActionParam('DraftInfo', null);
		$bDsn = '1' === (string) $this->GetActionParam('Dsn', '0');

		$oMessage = $this->buildMessage($oAccount, false);

		$this->Plugins()->RunHook('filter.send-message', array($oMessage));

		$mResult = false;
		try
		{
			if ($oMessage)
			{
				$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

				$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
					$oMessage->ToStream(true), array($rMessageStream), 8192, true, true, true);

				if (false !== $iMessageStreamSize)
				{
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream, $iMessageStreamSize, $bDsn, true);

					if (\is_array($aDraftInfo) && 3 === \count($aDraftInfo))
					{
						$sDraftInfoType = $aDraftInfo[0];
						$sDraftInfoUid = $aDraftInfo[1];
						$sDraftInfoFolder = $aDraftInfo[2];

						try
						{
							switch (\strtolower($sDraftInfoType))
							{
								case 'reply':
								case 'reply-all':
									$this->MailClient()->MessageSetFlag($sDraftInfoFolder, array($sDraftInfoUid), true,
										\MailSo\Imap\Enumerations\MessageFlag::ANSWERED, true);
									break;
								case 'forward':
									$sForwardedFlag = $this->Config()->Get('labs', 'imap_forwarded_flag', '');
									if (0 < strlen($sForwardedFlag))
									{
										$this->MailClient()->MessageSetFlag($sDraftInfoFolder, array($sDraftInfoUid), true,
											$sForwardedFlag, true);
									}
									break;
							}
						}
						catch (\Throwable $oException)
						{
							$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
						}
					}

					if (0 < \strlen($sSentFolder))
					{
						try
						{
							if (!$oMessage->GetBcc())
							{
								if (\is_resource($rMessageStream))
								{
									\rewind($rMessageStream);
								}

								$this->Plugins()->RunHook('filter.send-message-stream',
									array($oAccount, &$rMessageStream, &$iMessageStreamSize));

								$this->MailClient()->MessageAppendStream(
									$rMessageStream, $iMessageStreamSize, $sSentFolder, array(
										\MailSo\Imap\Enumerations\MessageFlag::SEEN
									)
								);
							}
							else
							{
								$rAppendMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

								$iAppendMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
									$oMessage->ToStream(false), array($rAppendMessageStream), 8192, true, true, true);

								$this->Plugins()->RunHook('filter.send-message-stream',
									array($oAccount, &$rAppendMessageStream, &$iAppendMessageStreamSize));

								$this->MailClient()->MessageAppendStream(
									$rAppendMessageStream, $iAppendMessageStreamSize, $sSentFolder, array(
										\MailSo\Imap\Enumerations\MessageFlag::SEEN
									));

								if (\is_resource($rAppendMessageStream))
								{
									fclose($rAppendMessageStream);
								}
							}
						}
						catch (\Throwable $oException)
						{
							throw new ClientException(Notifications::CantSaveMessage, $oException);
						}
					}

					if (\is_resource($rMessageStream))
					{
						\fclose($rMessageStream);
					}

					$this->deleteMessageAttachmnets($oAccount);

					if (0 < \strlen($sDraftFolder) && 0 < \strlen($sDraftUid))
					{
						try
						{
							$this->MailClient()->MessageDelete($sDraftFolder, array($sDraftUid), true, true);
						}
						catch (\Throwable $oException)
						{
							$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
						}
					}

					$mResult = true;
				}
			}
		}
		catch (Exceptions\ClientException $oException)
		{
			throw $oException;
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantSendMessage, $oException);
		}

		if (false === $mResult)
		{
			throw new ClientException(Notifications::CantSendMessage);
		}

		try
		{
			if ($oMessage && $this->AddressBookProvider($oAccount)->IsActive())
			{
				$aArrayToFrec = array();
				$oToCollection = $oMessage->GetTo();
				if ($oToCollection)
				{
					foreach ($oToCollection as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
					{
						$aArrayToFrec[$oEmail->GetEmail(true)] = $oEmail->ToString(false, true);
					}
				}

				if (0 < \count($aArrayToFrec))
				{
					$oSettings = $this->SettingsProvider()->Load($oAccount);

					$this->AddressBookProvider($oAccount)->IncFrec(
						$oAccount->ParentEmailHelper(), \array_values($aArrayToFrec),
							!!$oSettings->GetConf('ContactsAutosave',
								!!$oConfig->Get('defaults', 'contacts_autosave', true)));
				}
			}
		}
		catch (\Throwable $oException)
		{
			$this->Logger()->WriteException($oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoSendReadReceiptMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oMessage = $this->buildReadReceiptMessage($oAccount);

		$this->Plugins()->RunHook('filter.send-read-receipt-message', array($oMessage, $oAccount));

		$mResult = false;
		try
		{
			if ($oMessage)
			{
				$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

				$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
					$oMessage->ToStream(true), array($rMessageStream), 8192, true, true, true);

				if (false !== $iMessageStreamSize)
				{
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream, $iMessageStreamSize, false, false);

					if (\is_resource($rMessageStream))
					{
						\fclose($rMessageStream);
					}

					$mResult = true;

					$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');
					if (!empty($sReadReceiptFlag))
					{
						$sFolderFullName = $this->GetActionParam('MessageFolder', '');
						$sUid = $this->GetActionParam('MessageUid', '');

						$this->Cacher($oAccount)->Set(\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $sFolderFullName, $sUid), '1');

						if (0 < \strlen($sFolderFullName) && 0 < \strlen($sUid))
						{
							try
							{
								$this->MailClient()->MessageSetFlag($sFolderFullName, array($sUid), true, $sReadReceiptFlag, true, true);
							}
							catch (\Throwable $oException) {}
						}
					}
				}
			}
		}
		catch (Exceptions\ClientException $oException)
		{
			throw $oException;
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantSendMessage, $oException);
		}

		if (false === $mResult)
		{
			throw new ClientException(Notifications::CantSendMessage);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoMessageSetSeen() : array
	{
		return $this->messageSetFlag('MessageSetSeen', __FUNCTION__);
	}

	public function DoMessageSetSeenToAll() : array
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('Folder', '');
		$bSetAction = '1' === (string) $this->GetActionParam('SetAction', '0');
		$sThreadUids = \trim($this->GetActionParam('ThreadUids', ''));

		try
		{
			$this->MailClient()->MessageSetSeenToAll($sFolder, $bSetAction,
				!empty($sThreadUids) ? explode(',', $sThreadUids) : null);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoMessageSetFlagged() : array
	{
		return $this->messageSetFlag('MessageSetFlagged', __FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessage() : array
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');

		$sFolder = '';
		$iUid = 0;

		$aValues = $this->getDecodedClientRawKeyValue($sRawKey, 4);
		if ($aValues && 4 === count($aValues))
		{
			$sFolder = (string) $aValues[0];
			$iUid = (int) $aValues[1];

			$this->verifyCacheByKey($sRawKey);
		}
		else
		{
			$sFolder = $this->GetActionParam('Folder', '');
			$iUid = (int) $this->GetActionParam('Uid', 0);
		}

		$oAccount = $this->initMailClientConnection();

		try
		{
			$oMessage = $this->MailClient()->Message($sFolder, $iUid, true,
				$this->cacherForThreads(),
				(int) $this->Config()->Get('labs', 'imap_body_text_limit', 0)
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantGetMessage, $oException);
		}

		if ($oMessage)
		{
			$this->Plugins()->RunHook('filter.result-message', array($oMessage));

			$this->cacheByKey($sRawKey);
		}

		return $this->DefaultResponse(__FUNCTION__, $oMessage);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageDelete() : array
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('Folder', '');
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = \array_filter($aUids, function (&$sUid) {
			$sUid = (int) \trim($sUid);
			return 0 < $sUid;
		});

		try
		{
			$this->MailClient()->MessageDelete($sFolder, $aFilteredUids, true, true,
				!!$this->Config()->Get('labs', 'use_imap_expunge_all_on_delete', false));
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantDeleteMessage, $oException);
		}

		if ($this->Config()->Get('labs', 'use_imap_unselect', true))
		{
			try
			{
				$this->MailClient()->FolderUnSelect();
			}
			catch (\Throwable $oException)
			{
				unset($oException);
			}
		}

		$sHash = '';

		try
		{
			$sHash = $this->MailClient()->FolderHash($sFolder);
		}
		catch (\Throwable $oException)
		{
			unset($oException);
		}

		return $this->DefaultResponse(__FUNCTION__, '' === $sHash ? false : array($sFolder, $sHash));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageMove() : array
	{
		$this->initMailClientConnection();

		$sFromFolder = $this->GetActionParam('FromFolder', '');
		$sToFolder = $this->GetActionParam('ToFolder', '');
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));
		$bMarkAsRead = '1' === (string) $this->GetActionParam('MarkAsRead', '0');

		$aFilteredUids = \array_filter($aUids, function (&$mUid) {
			$mUid = (int) \trim($mUid);
			return 0 < $mUid;
		});

		if ($bMarkAsRead)
		{
			try
			{
				$this->MailClient()->MessageSetSeen($sFromFolder, $aFilteredUids, true, true);
			}
			catch (\Throwable $oException)
			{
				unset($oException);
			}
		}

		try
		{
			$this->MailClient()->MessageMove($sFromFolder, $sToFolder, $aFilteredUids, true,
				!!$this->Config()->Get('labs', 'use_imap_move', true),
				!!$this->Config()->Get('labs', 'use_imap_expunge_all_on_delete', false)
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantMoveMessage, $oException);
		}

		if ($this->Config()->Get('labs', 'use_imap_unselect', true))
		{
			try
			{
				$this->MailClient()->FolderUnSelect();
			}
			catch (\Throwable $oException)
			{
				unset($oException);
			}
		}

		$sHash = '';

		try
		{
			$sHash = $this->MailClient()->FolderHash($sFromFolder);
		}
		catch (\Throwable $oException)
		{
			unset($oException);
		}

		return $this->DefaultResponse(__FUNCTION__, '' === $sHash ? false : array($sFromFolder, $sHash));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageCopy() : array
	{
		$this->initMailClientConnection();

		$sFromFolder = $this->GetActionParam('FromFolder', '');
		$sToFolder = $this->GetActionParam('ToFolder', '');
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = \array_filter($aUids, function (&$mUid) {
			$mUid = (int) \trim($mUid);
			return 0 < $mUid;
		});

		try
		{
			$this->MailClient()->MessageCopy($sFromFolder, $sToFolder,
				$aFilteredUids, true);

			$sHash = $this->MailClient()->FolderHash($sFromFolder);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantCopyMessage, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__,
			'' === $sHash ? false : array($sFromFolder, $sHash));
	}

	public function DoMessageUploadAttachments() : array
	{
		$oAccount = $this->initMailClientConnection();

		$mResult = false;
		$self = $this;

		try
		{
			$aAttachments = $this->GetActionParam('Attachments', array());
			if (\is_array($aAttachments) && 0 < \count($aAttachments))
			{
				$mResult = array();
				foreach ($aAttachments as $sAttachment)
				{
					if ($aValues = \RainLoop\Utils::DecodeKeyValuesQ($sAttachment))
					{
						$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
						$iUid = (int) isset($aValues['Uid']) ? $aValues['Uid'] : 0;
						$sMimeIndex = (string) isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '';

						$sTempName = \md5($sAttachment);
						if (!$this->FilesProvider()->FileExists($oAccount, $sTempName))
						{
							$this->MailClient()->MessageMimeStream(
								function($rResource, $sContentType, $sFileName, $sMimeIndex = '') use ($oAccount, &$mResult, $sTempName, $sAttachment, $self) {
									if (is_resource($rResource))
									{
										$sContentType = (empty($sFileName)) ? 'text/plain' : \MailSo\Base\Utils::MimeContentType($sFileName);
										$sFileName = $self->MainClearFileName($sFileName, $sContentType, $sMimeIndex);

										if ($self->FilesProvider()->PutFile($oAccount, $sTempName, $rResource))
										{
											$mResult[$sTempName] = $sAttachment;
										}
									}
								}, $sFolder, $iUid, true, $sMimeIndex);
						}
						else
						{
							$mResult[$sTempName] = $sAttachment;
						}
					}
				}
			}
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

}
