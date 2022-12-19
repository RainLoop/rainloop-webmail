<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Exceptions\ClientException;
use RainLoop\Notifications;
use MailSo\Imap\Enumerations\FolderType;

trait Folders
{

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

		$oFolderCollection = $this->MailClient()->Folders('', '*', $HideUnsubscribed);

		if ($oFolderCollection) {
			$aQuota = null;
			if ($this->GetCapa(Capa::QUOTA)) {
				try {
//					$aQuota = $this->MailClient()->Quota();
					$aQuota = $this->MailClient()->QuotaRoot();
				} catch (\Throwable $oException) {
					// ignore
				}
			}

			$aCapabilities = \array_values(\array_filter($this->MailClient()->Capability(), function ($item) {
				return !\preg_match('/^(IMAP|AUTH|LOGIN|SASL)/', $item);
			}));

			$oFolderCollection = \array_merge(
				$oFolderCollection->jsonSerialize(),
				array(
					'quotaUsage' => $aQuota ? $aQuota[0] * 1024 : null,
					'quotaLimit' => $aQuota ? $aQuota[1] * 1024 : null,
					'namespace' => $this->MailClient()->GetPersonalNamespace(),
					'capabilities' => $aCapabilities
				)
			);
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
			$this->MailClient()->{$bSubscribe ? 'FolderSubscribe' : 'FolderUnsubscribe'}($sFolderFullName);
		}
		catch (\Throwable $oException)
		{
			throw new ClientException(
				$bSubscribe ? Notifications::CantSubscribeFolder : Notifications::CantUnsubscribeFolder,
				$oException
			);
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

		if (!\is_array($aCheckableFolder)) {
			$aCheckableFolder = array();
		}

		if ($bCheckable) {
			$aCheckableFolder[] = $sFolderFullName;
		} else {
			$aCheckableFolderNew = array();
			foreach ($aCheckableFolder as $sFolder) {
				if ($sFolder !== $sFolderFullName) {
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
		if (\is_array($aFolders)) {
			$this->initMailClientConnection();

			$aFolders = \array_unique($aFolders);
			foreach ($aFolders as $sFolder) {
				if (\strlen($sFolder) && 'INBOX' !== \strtoupper($sFolder)) {
					try
					{
						$aInboxInformation = $this->MailClient()->FolderInformation($sFolder);
						if (isset($aInboxInformation['Folder'])) {
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
}
