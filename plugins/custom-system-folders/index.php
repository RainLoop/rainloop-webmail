<?php

class CustomSystemFoldersPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Custom System Folders',
		CATEGORY = 'General',
		DESCRIPTION = 'Set custom sytem folders';

	/**
	 * @var string
	 */
	private $sSentFolder = '';

	/**
	 * @var string
	 */
	private $sDraftsFolder = '';

	/**
	 * @var string
	 */
	private $sSpamFolder = '';

	/**
	 * @var string
	 */
	private $sTrashFolder = '';

	/**
	 * @var string
	 */
	private $sArchiveFolder = '';

	public function Init() : void
	{
		$this->sSentFolder = \trim($this->Config()->Get('plugin', 'sent_folder', ''));
		$this->sDraftsFolder = \trim($this->Config()->Get('plugin', 'drafts_folder', ''));
		$this->sSpamFolder = \trim($this->Config()->Get('plugin', 'spam_folder', ''));
		$this->sTrashFolder = \trim($this->Config()->Get('plugin', 'trash_folder', ''));
		$this->sArchiveFolder = \trim($this->Config()->Get('plugin', 'archive_folder', ''));

		$this->addHook('filter.system-folders-names', 'FilterSystemFoldersNames');
		$this->addHook('filter.folders-system-types', 'FilterFoldersSystemTypes');
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aSystemTypes
	 */
	public function FilterFoldersSystemTypes($oAccount, &$aSystemTypes)
	{
		if ($oAccount)
		{
			$aSystemTypes = array();
			if (0 < \strlen($this->sSentFolder))
			{
				$aSystemTypes[] = \MailSo\Imap\Enumerations\FolderType::SENT;
			}

			if (0 < \strlen($this->sDraftsFolder))
			{
				$aSystemTypes[] = \MailSo\Imap\Enumerations\FolderType::DRAFTS;
			}

			if (0 < \strlen($this->sSpamFolder))
			{
				$aSystemTypes[] = \MailSo\Imap\Enumerations\FolderType::JUNK;
			}

			if (0 < \strlen($this->sTrashFolder))
			{
				$aSystemTypes[] = \MailSo\Imap\Enumerations\FolderType::TRASH;
			}

			if (0 < \strlen($this->sArchiveFolder))
			{
				$aSystemTypes[] = \MailSo\Imap\Enumerations\FolderType::ALL;
			}
		}
	}

	private function helperFolderType($sFolderName, $iType, &$aPrepend, &$aSystemFolderNames)
	{
		if (0 < \strlen($sFolderName) && '{@system@}' !== $sFolderName)
		{
			$aPrepend[$sFolderName] = $iType;
			if (isset($aSystemFolderNames[$sFolderName]))
			{
				unset($aSystemFolderNames[$sFolderName]);
			}
		}
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aSystemFolderNames
	 */
	public function FilterSystemFoldersNames($oAccount, &$aSystemFolderNames)
	{
		$aPrepend = array();
		if ($oAccount && \is_array($aSystemFolderNames))
		{
			$this->helperFolderType($this->sSentFolder, \MailSo\Imap\Enumerations\FolderType::SENT,
				$aPrepend, $aSystemFolderNames);

			$this->helperFolderType($this->sDraftsFolder, \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				$aPrepend, $aSystemFolderNames);

			$this->helperFolderType($this->sSpamFolder, \MailSo\Imap\Enumerations\FolderType::JUNK,
				$aPrepend, $aSystemFolderNames);

			$this->helperFolderType($this->sTrashFolder, \MailSo\Imap\Enumerations\FolderType::TRASH,
				$aPrepend, $aSystemFolderNames);

			$this->helperFolderType($this->sArchiveFolder, \MailSo\Imap\Enumerations\FolderType::ALL,
				$aPrepend, $aSystemFolderNames);

			if (0 < \count($aPrepend))
			{
				$aSystemFolderNames = \array_merge($aPrepend, $aSystemFolderNames);
			}
		}
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('sent_folder')->SetLabel('Sent')
				->SetDefaultValue('Sent'),
			\RainLoop\Plugins\Property::NewInstance('drafts_folder')->SetLabel('Drafts')
				->SetDefaultValue('Drafts'),
			\RainLoop\Plugins\Property::NewInstance('spam_folder')->SetLabel('Spam')
				->SetDefaultValue('Spam'),
			\RainLoop\Plugins\Property::NewInstance('trash_folder')->SetLabel('Trash')
				->SetDefaultValue('Trash'),
			\RainLoop\Plugins\Property::NewInstance('archive_folder')->SetLabel('Archive')
				->SetDefaultValue('Archive')
		);
	}
}
