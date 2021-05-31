<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\Notifications;
use \MailSo\Imap\Enumerations\FolderType;

trait Folders
{

	public function DoFolders() : array
	{
		$oAccount = $this->initMailClientConnection();

		$HideUnsubscribed = $this->Config()->Get('labs', 'use_imap_list_subscribe', true);
		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
		if ($oSettingsLocal instanceof \RainLoop\Settings) {
			$HideUnsubscribed = (bool) $oSettingsLocal->GetConf('HideUnsubscribed', $HideUnsubscribed);
		}

		$oFolderCollection = $this->MailClient()->Folders('',
			'*',
			$HideUnsubscribed,
			(int) $this->Config()->Get('labs', 'imap_folder_list_limit', 200)
		);

		if ($oFolderCollection instanceof \MailSo\Mail\FolderCollection)
		{
			$this->Plugins()->RunHook('filter.folders-post', array($oAccount, $oFolderCollection));

			$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

			$aSystemFolders = array();
			$this->recFoldersTypes($oAccount, $oFolderCollection, $aSystemFolders);
			$oFolderCollection->SystemFolders = $aSystemFolders;

			if ($this->Config()->Get('labs', 'autocreate_system_folders', true))
			{
				$bDoItAgain = false;

				$sNamespace = $oFolderCollection->GetNamespace();
				$sParent = empty($sNamespace) ? '' : \substr($sNamespace, 0, -1);

				$sDelimiter = $oFolderCollection->FindDelimiter();

				$aList = array();
				$aMap = $this->systemFoldersNames($oAccount);

				if ('' === $oSettingsLocal->GetConf('SentFolder', ''))
				{
					$aList[] = FolderType::SENT;
				}

				if ('' === $oSettingsLocal->GetConf('DraftFolder', ''))
				{
					$aList[] = FolderType::DRAFTS;
				}

				if ('' === $oSettingsLocal->GetConf('SpamFolder', ''))
				{
					$aList[] = FolderType::JUNK;
				}

				if ('' === $oSettingsLocal->GetConf('TrashFolder', ''))
				{
					$aList[] = FolderType::TRASH;
				}

				if ('' === $oSettingsLocal->GetConf('ArchiveFolder', ''))
				{
					$aList[] = FolderType::ALL;
				}

				$this->Plugins()->RunHook('filter.folders-system-types', array($oAccount, &$aList));

				foreach ($aList as $iType)
				{
					if (!isset($aSystemFolders[$iType]))
					{
						$mFolderNameToCreate = \array_search($iType, $aMap);
						if (!empty($mFolderNameToCreate))
						{
							$iPos = \strrpos($mFolderNameToCreate, $sDelimiter);
							if (false !== $iPos)
							{
								$mNewParent = \substr($mFolderNameToCreate, 0, $iPos);
								$mNewFolderNameToCreate = \substr($mFolderNameToCreate, $iPos + 1);
								if (0 < \strlen($mNewFolderNameToCreate))
								{
									$mFolderNameToCreate = $mNewFolderNameToCreate;
								}

								if (0 < \strlen($mNewParent))
								{
									$sParent = 0 < \strlen($sParent) ? $sParent.$sDelimiter.$mNewParent : $mNewParent;
								}
							}

							$sFullNameToCheck = \MailSo\Base\Utils::ConvertEncoding($mFolderNameToCreate,
								\MailSo\Base\Enumerations\Charset::UTF_8, \MailSo\Base\Enumerations\Charset::UTF_7_IMAP);

							if (0 < \strlen(\trim($sParent)))
							{
								$sFullNameToCheck = $sParent.$sDelimiter.$sFullNameToCheck;
							}

							if (!$oFolderCollection->GetByFullNameRaw($sFullNameToCheck))
							{
								try
								{
									if ($this->MailClient()->FolderCreate($mFolderNameToCreate, $sParent, true, $sDelimiter))
									{
										$bDoItAgain = true;
									}
								}
								catch (\Throwable $oException)
								{
									$this->Logger()->WriteException($oException);
								}
							}
						}
					}
				}

				if ($bDoItAgain)
				{
					$oFolderCollection = $this->MailClient()->Folders('', '*',
						$HideUnsubscribed,
						(int) $this->Config()->Get('labs', 'imap_folder_list_limit', 200)
					);

					if ($oFolderCollection)
					{
						$aSystemFolders = array();
						$this->recFoldersTypes($oAccount, $oFolderCollection, $aSystemFolders);
						$oFolderCollection->SystemFolders = $aSystemFolders;
					}
				}
			}

			if ($oFolderCollection)
			{
				$oFolderCollection->FoldersHash = \md5(\implode("\x0", $this->recFoldersNames($oFolderCollection)));
			}

			$this->Plugins()->RunHook('filter.folders-complete', array($oAccount, $oFolderCollection));
		}

		return $this->DefaultResponse(__FUNCTION__, $oFolderCollection);
	}

	public function DoFolderCreate() : array
	{
		$oAccount = $this->initMailClientConnection();

		try
		{
			$sFolderNameInUtf = $this->GetActionParam('Folder', '');
			$sFolderParentFullNameRaw = $this->GetActionParam('Parent', '');

			$this->MailClient()->FolderCreate($sFolderNameInUtf, $sFolderParentFullNameRaw,
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true));
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantCreateFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoFolderSubscribe() : array
	{
		$oAccount = $this->initMailClientConnection();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');
		$bSubscribe = '1' === (string) $this->GetActionParam('Subscribe', '0');

		try
		{
			$this->MailClient()->FolderSubscribe($sFolderFullNameRaw, !!$bSubscribe);
		}
		catch (\Throwable $oException)
		{
			if ($bSubscribe)
			{
				throw new ClientException(Notifications::CantSubscribeFolder, $oException);
			}
			else
			{
				throw new ClientException(Notifications::CantUnsubscribeFolder, $oException);
			}
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoFolderCheckable() : array
	{
		$oAccount = $this->getAccountFromToken();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');
		$bCheckable = '1' === (string) $this->GetActionParam('Checkable', '0');

		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

		$sCheckableFolder = $oSettingsLocal->GetConf('CheckableFolder', '[]');
		$aCheckableFolder = \json_decode($sCheckableFolder);

		if (!\is_array($aCheckableFolder))
		{
			$aCheckableFolder = array();
		}

		if ($bCheckable)
		{
			$aCheckableFolder[] = $sFolderFullNameRaw;
		}
		else
		{
			$aCheckableFolderNew = array();
			foreach ($aCheckableFolder as $sFolder)
			{
				if ($sFolder !== $sFolderFullNameRaw)
				{
					$aCheckableFolderNew[] = $sFolder;
				}
			}
			$aCheckableFolder = $aCheckableFolderNew;
		}

		$aCheckableFolder = \array_unique($aCheckableFolder);

		$oSettingsLocal->SetConf('CheckableFolder', \json_encode($aCheckableFolder));

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderMove() : array
	{
		$oAccount = $this->initMailClientConnection();

		try
		{
			$this->MailClient()->FolderMove(
				$this->GetActionParam('Folder', ''),
				$this->GetActionParam('NewFolder', ''),
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true)
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantRenameFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderRename() : array
	{
		$oAccount = $this->initMailClientConnection();

		try
		{
			$this->MailClient()->FolderRename(
				$this->GetActionParam('Folder', ''),
				$this->GetActionParam('NewFolderName', ''),
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true)
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantRenameFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderDelete() : array
	{
		$oAccount = $this->initMailClientConnection();

		try
		{
			$this->MailClient()->FolderDelete(
				$this->GetActionParam('Folder', ''),
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true)
			);
		}
		catch (\MailSo\Mail\Exceptions\NonEmptyFolder $oException)
		{
			throw new ClientException(Notifications::CantDeleteNonEmptyFolder, $oException);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantDeleteFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderClear() : array
	{
		$this->initMailClientConnection();

		try
		{
			$this->MailClient()->FolderClear($this->GetActionParam('Folder', ''));
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderInformation() : array
	{
		$sFolder = $this->GetActionParam('Folder', '');
		$sPrevUidNext = $this->GetActionParam('UidNext', '');
		$aFlagsUids = array();
		$sFlagsUids = (string) $this->GetActionParam('FlagsUids', '');

		$aFlagsFilteredUids = array();
		if (0 < strlen($sFlagsUids))
		{
			$aFlagsUids = \explode(',', $sFlagsUids);
			$aFlagsFilteredUids = \array_filter(\array_map('intval', $aFlagsUids));
		}

		$this->initMailClientConnection();

		$sForwardedFlag = $this->Config()->Get('labs', 'imap_forwarded_flag', '');
		$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');
		try
		{
			$aInboxInformation = $this->MailClient()->FolderInformation(
				$sFolder, $sPrevUidNext, $aFlagsFilteredUids
			);

			if (isset($aInboxInformation['Flags']) && \is_array($aInboxInformation['Flags']))
			{
				foreach ($aInboxInformation['Flags'] as $iUid => $aFlags)
				{
					$aLowerFlags = array_map('strtolower', $aFlags);
					$aInboxInformation['Flags'][$iUid] = array(
						'IsUnseen' => \in_array('\\unseen', $aLowerFlags) || !\in_array('\\seen', $aLowerFlags),
						'IsSeen' => in_array('\\seen', $aLowerFlags),
						'IsFlagged' => in_array('\\flagged', $aLowerFlags),
						'IsAnswered' => in_array('\\answered', $aLowerFlags),
						'IsDeleted' => in_array('\\deleted', $aLowerFlags),
						'IsForwarded' => 0 < strlen($sForwardedFlag) && in_array(strtolower($sForwardedFlag), $aLowerFlags),
						'IsReadReceipt' => 0 < strlen($sReadReceiptFlag) && in_array(strtolower($sReadReceiptFlag), $aLowerFlags)
					);
				}
			}
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}

		$aInboxInformation['Version'] = APP_VERSION;

		return $this->DefaultResponse(__FUNCTION__, $aInboxInformation);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderInformationMultiply() : array
	{
		$aResult = array(
			'List' => array(),
			'Version' => APP_VERSION
		);

		$aFolders = $this->GetActionParam('Folders', null);
		if (\is_array($aFolders))
		{
			$this->initMailClientConnection();

			$aFolders = \array_unique($aFolders);
			foreach ($aFolders as $sFolder)
			{
				if (0 < \strlen(\trim($sFolder)) && 'INBOX' !== \strtoupper($sFolder))
				{
					try
					{
						$aInboxInformation = $this->MailClient()->FolderInformation($sFolder, '', array());
						if (isset($aInboxInformation['Folder']))
						{
							$aResult['List'][] = $aInboxInformation;
						}
					}
					catch (\Throwable $oException)
					{
						$this->Logger()->WriteException($oException);
					}
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	public function DoSystemFoldersUpdate() : array
	{
		$oAccount = $this->getAccountFromToken();

		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

		$oSettingsLocal->SetConf('SentFolder', $this->GetActionParam('SentFolder', ''));
		$oSettingsLocal->SetConf('DraftFolder', $this->GetActionParam('DraftFolder', ''));
		$oSettingsLocal->SetConf('SpamFolder', $this->GetActionParam('SpamFolder', ''));
		$oSettingsLocal->SetConf('TrashFolder', $this->GetActionParam('TrashFolder', ''));
		$oSettingsLocal->SetConf('ArchiveFolder', $this->GetActionParam('ArchiveFolder', ''));

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	private function recFoldersNames(\MailSo\Mail\FolderCollection $oFolders) : array
	{
		$aResult = array();
		if ($oFolders)
		{
			foreach ($oFolders as $oFolder)
			{
				$aResult[] = $oFolder->FullNameRaw()."|".
					implode("|", $oFolder->Flags()).($oFolder->IsSubscribed() ? '1' : '0');

				$oSub = $oFolder->SubFolders();
				if ($oSub && 0 < $oSub->Count())
				{
					$aResult = \array_merge($aResult, $this->recFoldersNames($oSub));
				}
			}
		}

		return $aResult;
	}

	private function recFoldersTypes(\RainLoop\Model\Account $oAccount, \MailSo\Mail\FolderCollection $oFolders, array &$aResult, bool $bListFolderTypes = true) : void
	{
		if ($oFolders->Count())
		{
			if ($bListFolderTypes)
			{
				foreach ($oFolders as $oFolder)
				{
					$iFolderType = $oFolder->GetFolderListType();
					if (!isset($aResult[$iFolderType]) && \in_array($iFolderType, array(
						FolderType::INBOX,
						FolderType::SENT,
						FolderType::DRAFTS,
						FolderType::JUNK,
						FolderType::TRASH,
						FolderType::ALL
					)))
					{
						$aResult[$iFolderType] = $oFolder->FullNameRaw();
					}
				}

				foreach ($oFolders as $oFolder)
				{
					$oSub = $oFolder->SubFolders();
					if ($oSub && $oSub->Count())
					{
						$this->recFoldersTypes($oAccount, $oSub, $aResult, true);
					}
				}
			}

			$aMap = $this->systemFoldersNames($oAccount);
			foreach ($oFolders as $oFolder)
			{
				$sName = $oFolder->Name();
				$sFullName = $oFolder->FullName();

				if (isset($aMap[$sName]) || isset($aMap[$sFullName]))
				{
					$iFolderType = isset($aMap[$sName]) ? $aMap[$sName] : $aMap[$sFullName];
					if ((!isset($aResult[$iFolderType]) || $sName === $sFullName || "INBOX{$oFolder->Delimiter()}{$sName}" === $sFullName) && \in_array($iFolderType, array(
						FolderType::INBOX,
						FolderType::SENT,
						FolderType::DRAFTS,
						FolderType::JUNK,
						FolderType::TRASH,
						FolderType::ALL
					)))
					{
						$aResult[$iFolderType] = $oFolder->FullNameRaw();
					}
				}
			}

			foreach ($oFolders as $oFolder)
			{
				$oSub = $oFolder->SubFolders();
				if ($oSub && $oSub->Count())
				{
					$this->recFoldersTypes($oAccount, $oSub, $aResult, false);
				}
			}
		}
	}

	/**
	 * @staticvar array $aCache
	 */
	private function systemFoldersNames(\RainLoop\Model\Account $oAccount) : array
	{
		static $aCache = null;
		if (null === $aCache)
		{
			$aCache = array(

				'Sent' => FolderType::SENT,
				'Send' => FolderType::SENT,

				'Outbox' => FolderType::SENT,
				'Out box' => FolderType::SENT,

				'Sent Item' => FolderType::SENT,
				'Sent Items' => FolderType::SENT,
				'Send Item' => FolderType::SENT,
				'Send Items' => FolderType::SENT,
				'Sent Mail' => FolderType::SENT,
				'Sent Mails' => FolderType::SENT,
				'Send Mail' => FolderType::SENT,
				'Send Mails' => FolderType::SENT,

				'Drafts' => FolderType::DRAFTS,

				'Draft' => FolderType::DRAFTS,
				'Draft Mail' => FolderType::DRAFTS,
				'Draft Mails' => FolderType::DRAFTS,
				'Drafts Mail' => FolderType::DRAFTS,
				'Drafts Mails' => FolderType::DRAFTS,

				'Junk E-mail' => FolderType::JUNK,

				'Spam' => FolderType::JUNK,
				'Spams' => FolderType::JUNK,

				'Junk' => FolderType::JUNK,
				'Bulk Mail' => FolderType::JUNK,
				'Bulk Mails' => FolderType::JUNK,

				'Deleted Items' => FolderType::TRASH,

				'Trash' => FolderType::TRASH,
				'Deleted' => FolderType::TRASH,
				'Bin' => FolderType::TRASH,

				'Archive' => FolderType::ALL,
				'Archives' => FolderType::ALL,

				'All' => FolderType::ALL,
				'All Mail' => FolderType::ALL,
				'All Mails' => FolderType::ALL,
			);

			$aNewCache = array();
			foreach ($aCache as $sKey => $iType)
			{
				$aNewCache[$sKey] = $iType;
				$aNewCache[\str_replace(' ', '', $sKey)] = $iType;
			}

			$aCache = $aNewCache;

			$this->Plugins()->RunHook('filter.system-folders-names', array($oAccount, &$aCache));
		}

		return $aCache;
	}
}
