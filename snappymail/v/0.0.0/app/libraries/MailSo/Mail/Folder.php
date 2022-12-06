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

use MailSo\Imap\Enumerations\FolderType;
use MailSo\Imap\Enumerations\MetadataKeys;

/**
 * @category MailSo
 * @package Mail
 */
class Folder implements \JsonSerializable
{
	/**
	 * @var bool
	 */
	private $bExists;

	/**
	 * @var bool
	 */
	private $bSubscribed;

	/**
	 * @var \MailSo\Imap\Folder
	 */
	private $oImapFolder;

	/**
	 * @throws \InvalidArgumentException
	 */
	function __construct(\MailSo\Imap\Folder $oImapFolder, bool $bSubscribed = true, bool $bExists = true)
	{
		$this->oImapFolder = $oImapFolder;
		$this->bSubscribed = $bSubscribed || \in_array('\\subscribed', $oImapFolder->FlagsLowerCase());
		$this->bExists = $bExists;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \InvalidArgumentException
	 */
	public static function NewNonExistentInstance(string $sFullName, string $sDelimiter) : self
	{
		return new self(
			new \MailSo\Imap\Folder($sFullName, $sDelimiter, array('\\Noselect')), false, false);
	}

	public function Name() : string
	{
		return $this->oImapFolder->Name();
	}

	public function FullName() : string
	{
		return $this->oImapFolder->FullName();
	}

	public function NameRaw() : string
	{
		return $this->oImapFolder->NameRaw();
	}

	public function Delimiter() : string
	{
		return $this->oImapFolder->Delimiter();
	}

	public function FlagsLowerCase() : array
	{
		return $this->oImapFolder->FlagsLowerCase();
	}

	public function IsSubscribed() : bool
	{
		return $this->bSubscribed;
	}

	public function IsExists() : bool
	{
		return $this->bExists;
	}

	public function IsSelectable() : bool
	{
		return $this->bExists && $this->oImapFolder->IsSelectable();
	}

	public function Hash(string $sClientHash) : ?string
	{
		return $this->oImapFolder->getHash($sClientHash);
	}

	public function IsInbox() : bool
	{
		return $this->oImapFolder->IsInbox();
	}

	public function GetFolderListType() : int
	{
		$aFlags = $this->oImapFolder->FlagsLowerCase();
		// RFC 6154
//		$aFlags[] = \strtolower($this->oImapFolder->GetMetadata(MetadataKeys::SPECIALUSE));

		switch (true)
		{
			case \in_array('\\inbox', $aFlags) || 'INBOX' === \strtoupper($this->FullName()):
				return FolderType::INBOX;

			case \in_array('\\sent', $aFlags):
			case \in_array('\\sentmail', $aFlags):
				return FolderType::SENT;

			case \in_array('\\drafts', $aFlags):
				return FolderType::DRAFTS;

			case \in_array('\\junk', $aFlags):
			case \in_array('\\spam', $aFlags):
				return FolderType::JUNK;

			case \in_array('\\trash', $aFlags):
			case \in_array('\\bin', $aFlags):
				return FolderType::TRASH;

			case \in_array('\\important', $aFlags):
				return FolderType::IMPORTANT;

			case \in_array('\\flagged', $aFlags):
			case \in_array('\\starred', $aFlags):
				return FolderType::FLAGGED;

			case \in_array('\\archive', $aFlags):
				return FolderType::ARCHIVE;

			case \in_array('\\all', $aFlags):
			case \in_array('\\allmail', $aFlags):
				return FolderType::ALL;

			// TODO
//			case 'Templates' === $this->FullName():
//				return FolderType::TEMPLATES;
		}

		// Kolab
		$type = $this->GetMetadata(MetadataKeys::KOLAB_CTYPE) ?: $this->GetMetadata(MetadataKeys::KOLAB_CTYPE_SHARED);
		switch ($type)
		{
/*
			// TODO: Kolab
			case 'event':
			case 'event.default':
				return FolderType::CALENDAR;
			case 'contact':
			case 'contact.default':
				return FolderType::CONTACTS;
			case 'task':
			case 'task.default':
				return FolderType::TASKS;
			case 'note':
			case 'note.default':
				return FolderType::NOTES;
			case 'file':
			case 'file.default':
				return FolderType::FILES;
			case 'configuration':
				return FolderType::CONFIGURATION;
			case 'journal':
			case 'journal.default':
				return FolderType::JOURNAL;
*/
			case 'mail.inbox':
				return FolderType::INBOX;
//			case 'mail.outbox':
			case 'mail.sentitems':
				return FolderType::SENT;
			case 'mail.drafts':
				return FolderType::DRAFTS;
			case 'mail.junkemail':
				return FolderType::JUNK;
			case 'mail.wastebasket':
				return FolderType::TRASH;
		}

		return FolderType::USER;
	}

	/**
	 * @return mixed
	 */
	public function GetMetadata(string $sName) : ?string
	{
		return $this->oImapFolder->GetMetadata($sName);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
/*
		$aExtended = null;
		if (isset($this->oImapFolder->MESSAGES, $this->oImapFolder->UNSEEN, $this->oImapFolder->UIDNEXT)) {
			$aExtended = array(
				'totalEmails' => (int) $this->oImapFolder->MESSAGES,
				'unreadEmails' => (int) $this->oImapFolder->UNSEEN,
				'UidNext' => (int) $this->oImapFolder->UIDNEXT,
//				'Hash' => $this->Hash($this->MailClient()->GenerateImapClientHash())
			);
		}
*/
		return array(
			'@Object' => 'Object/Folder',
			'Name' => $this->Name(),
			'FullName' => $this->FullName(),
			'Delimiter' => (string) $this->Delimiter(),
			'isSubscribed' => $this->bSubscribed,
			'Exists' => $this->bExists,
			'Selectable' => $this->IsSelectable(),
			'Flags' => $this->FlagsLowerCase(),
//			'Extended' => $aExtended,
//			'PermanentFlags' => $this->oImapFolder->PermanentFlags,
			'Metadata' => $this->oImapFolder->Metadata(),
			'UidNext' => $this->oImapFolder->UIDNEXT,
			// RFC 8621
			'totalEmails' => $this->oImapFolder->MESSAGES,
			'unreadEmails' => $this->oImapFolder->UNSEEN,
			'id' => $this->oImapFolder->MAILBOXID
		);
	}
}
