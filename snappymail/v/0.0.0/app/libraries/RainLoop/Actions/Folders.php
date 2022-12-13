<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Exceptions\ClientException;
use RainLoop\Notifications;
use MailSo\Imap\Enumerations\FolderType;

trait Folders
{

	private function getFolderCollection(bool $HideUnsubscribed) : ?\MailSo\Mail\FolderCollection
	{
		return $this->MailClient()->Folders('', '*', $HideUnsubscribed);
	}

	/**
	 * Appends uploaded rfc822 message to mailbox
	 * @throws \MailSo\RuntimeException
	 */
	public function Append(): bool
	{
		$oAccount = $this->initMailClientConnection();

		$sFolderFullName = $this->GetActionParam('Folder', '');

		if ($oAccount
		 && !empty($sFolderFullName)
		 && !empty($_FILES['AppendFile'])
		 && \is_uploaded_file($_FILES['AppendFile']['tmp_name'])
		 && \UPLOAD_ERR_OK == $_FILES['AppendFile']['error']
		 && $this->oConfig->Get('labs', 'allow_message_append', false)
		) {
			$sSavedName = 'append-post-' . \md5($sFolderFullName . $_FILES['AppendFile']['name'] . $_FILES['AppendFile']['tmp_name']);
			if ($this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $_FILES['AppendFile']['tmp_name'])) {
				$iMessageStreamSize = $this->FilesProvider()->FileSize($oAccount, $sSavedName);
				$rMessageStream = $this->FilesProvider()->GetFile($oAccount, $sSavedName);

				$this->MailClient()->MessageAppendStream($rMessageStream, $iMessageStreamSize, $sFolderFullName);

				$this->FilesProvider()->Clear($oAccount, $sSavedName);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, true);
	}

	public function DoFolders() : array
	{
		$oAccount = $this->initMailClientConnection();

		$HideUnsubscribed = false;
		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
		if ($oSettingsLocal instanceof \RainLoop\Settings) {
			$HideUnsubscribed = (bool) $oSettingsLocal->GetConf('HideUnsubscribed', $HideUnsubscribed);
		}

		$oFolderCollection = $this->getFolderCollection($HideUnsubscribed);

		if ($oFolderCollection)
		{
			$sNamespace = $this->MailClient()->GetPersonalNamespace();

			$this->Plugins()->RunHook('filter.folders-post', array($oAccount, $oFolderCollection));

			$aSystemFolders = array();
			$this->recFoldersTypes($oAccount, $oFolderCollection, $aSystemFolders);

			if ($this->Config()->Get('labs', 'autocreate_system_folders', false))
			{
				$bDoItAgain = false;

				$sParent = \substr($sNamespace, 0, -1);

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
					$aList[] = FolderType::ARCHIVE;
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
								if (\strlen($mNewFolderNameToCreate))
								{
									$mFolderNameToCreate = $mNewFolderNameToCreate;
								}

								if (\strlen($mNewParent))
								{
									$sParent = \strlen($sParent) ? $sParent.$sDelimiter.$mNewParent : $mNewParent;
								}
							}

							$sFullNameToCheck = $mFolderNameToCreate;
							if (\strlen($sParent))
							{
								$sFullNameToCheck = $sParent.$sDelimiter.$sFullNameToCheck;
							}

							if (!isset($oFolderCollection[$sFullNameToCheck]))
							{
								try
								{
									$this->MailClient()->FolderCreate($mFolderNameToCreate, $sParent, true, $sDelimiter);
									$bDoItAgain = true;
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
					$oFolderCollection = $this->getFolderCollection($HideUnsubscribed);

					if ($oFolderCollection)
					{
						$aSystemFolders = array();
						$this->recFoldersTypes($oAccount, $oFolderCollection, $aSystemFolders);
					}
				}
			}

			if ($oFolderCollection)
			{
				$this->Plugins()->RunHook('filter.folders-complete', array($oAccount, $oFolderCollection));

				$aQuota = null;
				if ($this->GetCapa(Capa::QUOTA)) {
					try {
//						$aQuota = $this->MailClient()->Quota();
						$aQuota = $this->MailClient()->QuotaRoot();
					} catch (\Throwable $oException) {
						// ignore
					}
				}

				$aCapabilities = \array_filter($this->MailClient()->Capability(), function ($item) {
					return !\preg_match('/^(IMAP|AUTH|LOGIN|SASL)/', $item);
				});

				$oFolderCollection = \array_merge(
					$oFolderCollection->jsonSerialize(),
					array(
						'quotaUsage' => $aQuota ? $aQuota[0] * 1024 : null,
						'quotaLimit' => $aQuota ? $aQuota[1] * 1024 : null,
						'Namespace' => $sNamespace,
						'IsThreadsSupported' => $this->MailClient()->IsThreadsSupported(),
						'Optimized' => $oFolderCollection->Optimized,
						'CountRec' => $oFolderCollection->TotalCount,
						'SystemFolders' => empty($aSystemFolders) ? null : $aSystemFolders,
						'Capabilities' => \array_values($aCapabilities)
					)
				);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $oFolderCollection);
	}

	public function DoFolderCreate() : array
	{
		$this->initMailClientConnection();

		try
		{
			$oFolder = $this->MailClient()->FolderCreate(
				$this->GetActionParam('Folder', ''),
				$this->GetActionParam('Parent', ''),
				!!$this->GetActionParam('Subscribe', 1)
			);

//			FolderInformation(string $sFolderName, int $iPrevUidNext = 0, array $aUids = array())
			return $this->DefaultResponse(__FUNCTION__, $oFolder);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantCreateFolder, $oException);
		}
	}

	public function DoFolderSetMetadata() : array
	{
		$this->initMailClientConnection();
		$sFolderFullName = $this->GetActionParam('Folder');
		$sMetadataKey = $this->GetActionParam('Key');
		if ($sFolderFullName && $sMetadataKey) {
			$this->MailClient()->FolderSetMetadata($sFolderFullName, [
				$sMetadataKey => $this->GetActionParam('Value') ?: null
			]);
		}
		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoFolderSubscribe() : array
	{
		$this->initMailClientConnection();

		$sFolderFullName = $this->GetActionParam('Folder', '');
		$bSubscribe = '1' === (string) $this->GetActionParam('Subscribe', '0');

		try
		{
			$this->MailClient()->FolderSubscribe($sFolderFullName, $bSubscribe);
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

		$sFolderFullName = $this->GetActionParam('Folder', '');
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
			$aCheckableFolder[] = $sFolderFullName;
		}
		else
		{
			$aCheckableFolderNew = array();
			foreach ($aCheckableFolder as $sFolder)
			{
				if ($sFolder !== $sFolderFullName)
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
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFolderMove() : array
	{
		$this->initMailClientConnection();

		try
		{
			$this->MailClient()->FolderMove(
				$this->GetActionParam('Folder', ''),
				$this->GetActionParam('NewFolder', ''),
				!!$this->GetActionParam('Subscribe', 1)
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantRenameFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFolderRename() : array
	{
		$this->initMailClientConnection();

		$sName = $this->GetActionParam('NewFolderName', '');
		try
		{
			$sFullName = $this->MailClient()->FolderRename(
				$this->GetActionParam('Folder', ''),
				$sName,
				!!$this->GetActionParam('Subscribe', 1)
			);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::CantRenameFolder, $oException);
		}

//		FolderInformation(string $sFolderName, int $iPrevUidNext = 0, array $aUids = array())
		return $this->DefaultResponse(__FUNCTION__, array(
			'Name' => $sName,
			'FullName' => $sFullName,
		));
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFolderDelete() : array
	{
		$this->initMailClientConnection();

		try
		{
			$this->MailClient()->FolderDelete($this->GetActionParam('Folder', ''));
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
	 * @throws \MailSo\RuntimeException
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
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFolderInformation() : array
	{
		$this->initMailClientConnection();

		try
		{
			$aInboxInformation = $this->MailClient()->FolderInformation(
				$this->GetActionParam('Folder', ''),
				(int) $this->GetActionParam('UidNext', 0),
				new \MailSo\Imap\SequenceSet($this->GetActionParam('FlagsUids', []))
			);
			return $this->DefaultResponse(__FUNCTION__, $aInboxInformation);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(Notifications::MailServerError, $oException);
		}
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoFolderInformationMultiply() : array
	{
		$aResult = array();

		$aFolders = $this->GetActionParam('Folders', null);
		if (\is_array($aFolders))
		{
			$this->initMailClientConnection();

			$aFolders = \array_unique($aFolders);
			foreach ($aFolders as $sFolder)
			{
				if (\strlen($sFolder) && 'INBOX' !== \strtoupper($sFolder))
				{
					try
					{
						$aInboxInformation = $this->MailClient()->FolderInformation($sFolder);
						if (isset($aInboxInformation['Folder']))
						{
							$aResult[] = [
								'Folder' => $aInboxInformation['Folder'],
								'Hash' => $aInboxInformation['Hash'],
								'totalEmails' => $aInboxInformation['totalEmails'],
								'unreadEmails' => $aInboxInformation['unreadEmails'],
							];
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

		$oSettingsLocal->SetConf('SentFolder', $this->GetActionParam('Sent', ''));
		$oSettingsLocal->SetConf('DraftFolder', $this->GetActionParam('Drafts', ''));
		$oSettingsLocal->SetConf('SpamFolder', $this->GetActionParam('Spam', ''));
		$oSettingsLocal->SetConf('TrashFolder', $this->GetActionParam('Trash', ''));
		$oSettingsLocal->SetConf('ArchiveFolder', $this->GetActionParam('Archive', ''));

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
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
						FolderType::ARCHIVE
					)))
					{
						$aResult[$iFolderType] = $oFolder->FullName();
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
						FolderType::ARCHIVE
					)))
					{
						$aResult[$iFolderType] = $oFolder->FullName();
					}
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

				'Archive' => FolderType::ARCHIVE,
				'Archives' => FolderType::ARCHIVE,

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
