<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\Model\Account;
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
		$iUidNext = 0;
		$bUseThreads = false;
		$iThreadUid = 0;
		$sSort = '';

		$sRawKey = $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedClientRawKeyValue($sRawKey, 10);

		if ($aValues && 7 < \count($aValues))
		{
			$sFolder = (string) $aValues[2];
			$iOffset = (int) $aValues[3];
			$iLimit = (int) $aValues[4];
			$sSearch = (string) $aValues[5];
			$iUidNext = (int) $aValues[6];
			$bUseThreads = (bool) $aValues[7];

			if ($bUseThreads)
			{
				$iThreadUid = isset($aValues[8]) ? (int) $aValues[8] : 0;
			}

			$sSort = isset($aValues[9]) ? (string) $aValues[9] : '';

			$this->verifyCacheByKey($sRawKey);
		}
		else
		{
			$sFolder = $this->GetActionParam('Folder', '');
			$iOffset = (int) $this->GetActionParam('Offset', 0);
			$iLimit = (int) $this->GetActionParam('Limit', 10);
			$sSearch = $this->GetActionParam('Search', '');
			$sSort = $this->GetActionParam('Sort', '');
			$iUidNext = (int) $this->GetActionParam('UidNext', 0);
			$bUseThreads = !empty($this->GetActionParam('UseThreads', '0'));

			if ($bUseThreads)
			{
				$iThreadUid = (int) $this->GetActionParam('ThreadUid', '');
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
				$sFolder, $iOffset, $iLimit, $sSearch, $iUidNext,
				$this->cacherForUids(),
				!!$this->Config()->Get('labs', 'use_imap_sort', true),
				$bUseThreads,
				$iThreadUid,
				'',
				$sSort
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

		$sMessageFolder = $this->GetActionParam('MessageFolder', '');
		$iMessageUid = $this->GetActionParam('MessageUid', 0);

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

				if (0 < strlen($sMessageFolder) && 0 < $iMessageUid)
				{
					$this->MailClient()->MessageDelete($sMessageFolder, array($iMessageUid), true, true);
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

		$oConfig = $this->Config();

		$sDraftFolder = $this->GetActionParam('MessageFolder', '');
		$iDraftUid = $this->GetActionParam('MessageUid', 0);
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

					if (0 < \strlen($sDraftFolder) && 0 < $iDraftUid)
					{
						try
						{
							$this->MailClient()->MessageDelete($sDraftFolder, array($iDraftUid), true, true);
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
		catch (ClientException $oException)
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
						$iUid = (int) $this->GetActionParam('MessageUid', 0);

						$this->Cacher($oAccount)->Set(\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $sFolderFullName, $iUid), '1');

						if (0 < \strlen($sFolderFullName) && 0 < $iUid)
						{
							try
							{
								$this->MailClient()->MessageSetFlag($sFolderFullName, array($iUid), true, $sReadReceiptFlag, true, true);
							}
							catch (\Throwable $oException) {}
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

		$aFilteredUids = \array_filter(\array_map('intval', $aUids));

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
		$bMarkAsRead = !empty($this->GetActionParam('MarkAsRead', '0'));

		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));
		$aFilteredUids = \array_filter(\array_map('intval', $aUids));

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
		$aFilteredUids = \array_filter(\array_map('intval', $aUids));

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
						$iUid = isset($aValues['Uid']) ? (int) $aValues['Uid'] : 0;
						$sMimeIndex = isset($aValues['MimeIndex']) ? (string) $aValues['MimeIndex'] : '';

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

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 * @throws \MailSo\Net\Exceptions\ConnectionException
	 */
	private function smtpSendMessage(Account $oAccount, \MailSo\Mime\Message $oMessage,
		/*resource*/ &$rMessageStream, int &$iMessageStreamSize, bool $bDsn = false, bool $bAddHiddenRcpt = true)
	{
		$oRcpt = $oMessage->GetRcpt();
		if ($oRcpt && 0 < $oRcpt->Count())
		{
			$this->Plugins()->RunHook('filter.smtp-message-stream',
				array($oAccount, &$rMessageStream, &$iMessageStreamSize));

			$this->Plugins()->RunHook('filter.message-rcpt', array($oAccount, $oRcpt));

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

				$bUsePhpMail = $oAccount->Domain()->OutUsePhpMail();

				$oSmtpClient = new \MailSo\Smtp\SmtpClient();
				$oSmtpClient->SetLogger($this->Logger());
				$oSmtpClient->SetTimeOuts(10, (int) \RainLoop\Api::Config()->Get('labs', 'smtp_timeout', 60));

				$oAccount->OutConnectAndLoginHelper(
					$this->Plugins(), $oSmtpClient, $this->Config(), $bUsePhpMail
				);

				if ($bUsePhpMail)
				{
					if (\MailSo\Base\Utils::FunctionExistsAndEnabled('mail'))
					{
						$aToCollection = $oMessage->GetTo();
						if ($aToCollection && $oFrom)
						{
							$sRawBody = \stream_get_contents($rMessageStream);
							if (!empty($sRawBody))
							{
								$sMailTo = \trim($aToCollection->ToString(true));
								$sMailSubject = \trim($oMessage->GetSubject());
								$sMailSubject = 0 === \strlen($sMailSubject) ? '' : \MailSo\Base\Utils::EncodeUnencodedValue(
									\MailSo\Base\Enumerations\Encoding::BASE64_SHORT, $sMailSubject);

								$sMailHeaders = $sMailBody = '';
								list($sMailHeaders, $sMailBody) = \explode("\r\n\r\n", $sRawBody, 2);
								unset($sRawBody);

								if ($this->Config()->Get('labs', 'mail_func_clear_headers', true))
								{
									$sMailHeaders = \MailSo\Base\Utils::RemoveHeaderFromHeaders($sMailHeaders, array(
										\MailSo\Mime\Enumerations\Header::TO_,
										\MailSo\Mime\Enumerations\Header::SUBJECT
									));
								}

								if ($this->Config()->Get('debug', 'enable', false))
								{
									$this->Logger()->WriteDump(array(
										$sMailTo, $sMailSubject, $sMailBody, $sMailHeaders
									));
								}

								$bR = $this->Config()->Get('labs', 'mail_func_additional_parameters', false) ?
									\mail($sMailTo, $sMailSubject, $sMailBody, $sMailHeaders, '-f'.$oFrom->GetEmail()) :
									\mail($sMailTo, $sMailSubject, $sMailBody, $sMailHeaders);

								if (!$bR)
								{
									throw new ClientException(Notifications::CantSendMessage);
								}
							}
						}
					}
					else
					{
						throw new ClientException(Notifications::CantSendMessage);
					}
				}
				else if ($oSmtpClient->IsConnected())
				{
					if (!empty($sFrom))
					{
						$oSmtpClient->MailFrom($sFrom, '', $bDsn);
					}

					foreach ($oRcpt as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
					{
						$oSmtpClient->Rcpt($oEmail->GetEmail(), $bDsn);
					}

					if ($bAddHiddenRcpt && \is_array($aHiddenRcpt) && 0 < \count($aHiddenRcpt))
					{
						foreach ($aHiddenRcpt as $sEmail)
						{
							if (\preg_match('/^[^@\s]+@[^@\s]+$/', $sEmail))
							{
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
				if ($this->Config()->Get('labs', 'smtp_show_server_errors'))
				{
					throw new ClientException(Notifications::ClientViewError, $oException);
				}
				else
				{
					throw new ClientException(Notifications::ConnectionError, $oException);
				}
			}
			catch (\MailSo\Smtp\Exceptions\LoginException $oException)
			{
				throw new ClientException(Notifications::AuthError, $oException);
			}
			catch (\Throwable $oException)
			{
				if ($this->Config()->Get('labs', 'smtp_show_server_errors'))
				{
					throw new ClientException(Notifications::ClientViewError, $oException);
				}
				else
				{
					throw $oException;
				}
			}
		}
		else
		{
			throw new ClientException(Notifications::InvalidRecipients);
		}
	}

	private function messageSetFlag(string $sActionFunction, string $sResponseFunction) : array
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('Folder', '');
		$bSetAction = '1' === (string) $this->GetActionParam('SetAction', '0');
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));
		$aFilteredUids = \array_filter(\array_map('intval', $aUids));

		try
		{
			$this->MailClient()->{$sActionFunction}($sFolder, $aFilteredUids, true, $bSetAction, true);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse($sResponseFunction);
	}

	private function getDecodedClientRawKeyValue(string $sRawKey, ?int $iLenCache = null) : ?array
	{
		if (!empty($sRawKey))
		{
			$sRawKey = \MailSo\Base\Utils::UrlSafeBase64Decode($sRawKey);
			$aValues = explode("\x0", $sRawKey);

			if (null === $iLenCache || $iLenCache  === count($aValues))
			{
				return $aValues;
			}
		}

		return null;
	}

	private function deleteMessageAttachmnets(Account $oAccount) : void
	{
		$aAttachments = $this->GetActionParam('Attachments', null);

		if (\is_array($aAttachments))
		{
			foreach (\array_keys($aAttachments) as $sTempName)
			{
				if ($this->FilesProvider()->FileExists($oAccount, $sTempName))
				{
					$this->FilesProvider()->Clear($oAccount, $sTempName);
				}
			}
		}
	}

	/**
	 * @return MailSo\Cache\CacheClient|null
	 */
	private function cacherForUids()
	{
		$oAccount = $this->getAccountFromToken(false);
		return ($this->Config()->Get('cache', 'enable', true) &&
			$this->Config()->Get('cache', 'server_uids', false)) ? $this->Cacher($oAccount) : null;
	}

	/**
	 * @return MailSo\Cache\CacheClient|null
	 */
	private function cacherForThreads()
	{
		$oAccount = $this->getAccountFromToken(false);
		return !!$this->Config()->Get('labs', 'use_imap_thread', false) ? $this->Cacher($oAccount) : null;
	}

	private function buildReadReceiptMessage(Account $oAccount) : \MailSo\Mime\Message
	{
		$sReadReceipt = $this->GetActionParam('ReadReceipt', '');
		$sSubject = $this->GetActionParam('Subject', '');
		$sText = $this->GetActionParam('Text', '');

		$oIdentity = $this->GetIdentityByID($oAccount, '', true);

		if (empty($sReadReceipt) || empty($sSubject) || empty($sText) || !$oIdentity)
		{
			throw new ClientException(Notifications::UnknownError);
		}

		$oMessage = new \MailSo\Mime\Message();

		if (!$this->Config()->Get('security', 'hide_x_mailer_header', true))
		{
			$oMessage->SetXMailer('SnappyMail/'.APP_VERSION);
		}

		$oMessage->SetFrom(new \MailSo\Mime\Email($oIdentity->Email(), $oIdentity->Name()));

		$oFrom = $oMessage->GetFrom();
		$oMessage->RegenerateMessageId($oFrom ? $oFrom->GetDomain() : '');

		$sReplyTo = $oIdentity->ReplyTo();
		if (!empty($sReplyTo))
		{
			$oReplyTo = new \MailSo\Mime\EmailCollection($sReplyTo);
			if ($oReplyTo && $oReplyTo->Count())
			{
				$oMessage->SetReplyTo($oReplyTo);
			}
		}

		$oMessage->SetSubject($sSubject);

		$oToEmails = new \MailSo\Mime\EmailCollection($sReadReceipt);
		if ($oToEmails && $oToEmails->Count())
		{
			$oMessage->SetTo($oToEmails);
		}

		$this->Plugins()->RunHook('filter.read-receipt-message-plain', array($oAccount, $oMessage, &$sText));

		$oMessage->AddText($sText, false);

		$this->Plugins()->RunHook('filter.build-read-receipt-message', array($oMessage, $oAccount));

		return $oMessage;
	}

	private function buildMessage(Account $oAccount, bool $bWithDraftInfo = true) : \MailSo\Mime\Message
	{
		$sIdentityID = $this->GetActionParam('IdentityID', '');
		$sTo = $this->GetActionParam('To', '');
		$sCc = $this->GetActionParam('Cc', '');
		$sBcc = $this->GetActionParam('Bcc', '');
		$sReplyTo = $this->GetActionParam('ReplyTo', '');
		$sSubject = $this->GetActionParam('Subject', '');
		$bTextIsHtml = '1' === $this->GetActionParam('TextIsHtml', '0');
		$bReadReceiptRequest = '1' === $this->GetActionParam('ReadReceiptRequest', '0');
		$bMarkAsImportant = '1' === $this->GetActionParam('MarkAsImportant', '0');
		$sText = $this->GetActionParam('Text', '');
		$aAttachments = $this->GetActionParam('Attachments', null);

		$aDraftInfo = $this->GetActionParam('DraftInfo', null);
		$sInReplyTo = $this->GetActionParam('InReplyTo', '');
		$sReferences = $this->GetActionParam('References', '');

		$oMessage = new \MailSo\Mime\Message();

		if (!$this->Config()->Get('security', 'hide_x_mailer_header', true))
		{
			$oMessage->SetXMailer('SnappyMail/'.APP_VERSION);
		} else {
			$oMessage->DoesNotAddDefaultXMailer();
		}

		$oFromIdentity = $this->GetIdentityByID($oAccount, $sIdentityID);
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

		$oFrom = $oMessage->GetFrom();
		$oMessage->RegenerateMessageId($oFrom ? $oFrom->GetDomain() : '');

		if (!empty($sReplyTo))
		{
			$oReplyTo = new \MailSo\Mime\EmailCollection($sReplyTo);
			if ($oReplyTo && 0 < $oReplyTo->Count())
			{
				$oMessage->SetReplyTo($oReplyTo);
			}
		}

		if ($bReadReceiptRequest)
		{
			// Read Receipts Reference Main Account Email, Not Identities #147
//			$oMessage->SetReadReceipt(($oFromIdentity ?: $oAccount)->Email());
			$oMessage->SetReadReceipt($oFrom->GetEmail());
		}

		if ($bMarkAsImportant)
		{
			$oMessage->SetPriority(\MailSo\Mime\Enumerations\MessagePriority::HIGH);
		}

		$oMessage->SetSubject($sSubject);

		$oToEmails = new \MailSo\Mime\EmailCollection($sTo);
		if ($oToEmails && $oToEmails->Count())
		{
			$oMessage->SetTo($oToEmails);
		}

		$oCcEmails = new \MailSo\Mime\EmailCollection($sCc);
		if ($oCcEmails && $oCcEmails->Count())
		{
			$oMessage->SetCc($oCcEmails);
		}

		$oBccEmails = new \MailSo\Mime\EmailCollection($sBcc);
		if ($oBccEmails && $oBccEmails->Count())
		{
			$oMessage->SetBcc($oBccEmails);
		}

		if ($bWithDraftInfo && \is_array($aDraftInfo) && !empty($aDraftInfo[0]) && !empty($aDraftInfo[1]) && !empty($aDraftInfo[2]))
		{
			$oMessage->SetDraftInfo($aDraftInfo[0], $aDraftInfo[1], $aDraftInfo[2]);
		}

		if (0 < \strlen($sInReplyTo))
		{
			$oMessage->SetInReplyTo($sInReplyTo);
		}

		if (0 < \strlen($sReferences))
		{
			$oMessage->SetReferences($sReferences);
		}

		$aFoundedCids = array();
		$mFoundDataURL = array();
		$aFoundedContentLocationUrls = array();

		$sTextToAdd = $bTextIsHtml ?
			\MailSo\Base\HtmlUtils::BuildHtml($sText, $aFoundedCids, $mFoundDataURL, $aFoundedContentLocationUrls) : $sText;

		$this->Plugins()->RunHook($bTextIsHtml ? 'filter.message-html' : 'filter.message-plain',
			array($oAccount, $oMessage, &$sTextToAdd));

		if ($bTextIsHtml && 0 < \strlen($sTextToAdd))
		{
			$sTextConverted = \MailSo\Base\HtmlUtils::ConvertHtmlToPlain($sTextToAdd);
			$this->Plugins()->RunHook('filter.message-plain', array($oAccount, $oMessage, &$sTextConverted));
			$oMessage->AddText($sTextConverted, false);
		}

		$oMessage->AddText($sTextToAdd, $bTextIsHtml);

		if (\is_array($aAttachments))
		{
			foreach ($aAttachments as $sTempName => $aData)
			{
				$sFileName = (string) $aData[0];
				$bIsInline = (bool) $aData[1];
				$sCID = (string) $aData[2];
				$sContentLocation = isset($aData[3]) ? (string) $aData[3] : '';

				$rResource = $this->FilesProvider()->GetFile($oAccount, $sTempName);
				if (\is_resource($rResource))
				{
					$iFileSize = $this->FilesProvider()->FileSize($oAccount, $sTempName);

					$oMessage->Attachments()->append(
						new \MailSo\Mime\Attachment($rResource, $sFileName, $iFileSize, $bIsInline,
							\in_array(trim(trim($sCID), '<>'), $aFoundedCids),
							$sCID, array(), $sContentLocation
						)
					);
				}
			}
		}

		if ($mFoundDataURL && \is_array($mFoundDataURL) && 0 < \count($mFoundDataURL))
		{
			foreach ($mFoundDataURL as $sCidHash => $sDataUrlString)
			{
				$aMatch = array();
				$sCID = '<'.$sCidHash.'>';
				if (\preg_match('/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/i', $sDataUrlString, $aMatch) &&
					!empty($aMatch[1]) && !empty($aMatch[2]))
				{
					$sRaw = \MailSo\Base\Utils::Base64Decode($aMatch[2]);
					$iFileSize = \strlen($sRaw);
					if (0 < $iFileSize)
					{
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
		}

		$this->Plugins()->RunHook('filter.build-message', array($oMessage));

		return $oMessage;
	}
}
