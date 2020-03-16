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

/**
 * @category MailSo
 * @package Mail
 */
class Folder
{
	/**
	 * @var string
	 */
	private $sParentFullNameRaw;

	/**
	 * @var int
	 */
	private $iNestingLevel;

	/**
	 * @var bool
	 */
	private $bExisten;

	/**
	 * @var bool
	 */
	private $bSubscribed;

	/**
	 * @var \MailSo\Imap\Folder
	 */
	private $oImapFolder;

	/**
	 * @var \MailSo\Mail\FolderCollection
	 */
	private $oSubFolders;

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	private function __construct(\MailSo\Imap\Folder $oImapFolder, bool $bSubscribed = true, bool $bExisten = true)
	{
		$this->oImapFolder = $oImapFolder;
		$this->oSubFolders = null;

		$aNames = \explode($this->oImapFolder->Delimiter(), $this->oImapFolder->FullNameRaw());
		$this->iNestingLevel = \count($aNames);

		$this->sParentFullNameRaw = '';
		if (1 < $this->iNestingLevel)
		{
			\array_pop($aNames);
			$this->sParentFullNameRaw = \implode($this->oImapFolder->Delimiter(), $aNames);
		}

		$this->bSubscribed = $bSubscribed;
		$this->bExisten = $bExisten;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public static function NewInstance(\MailSo\Imap\Folder $oImapFolder, bool $bSubscribed = true, bool $bExisten = true) : self
	{
		return new self($oImapFolder, $bSubscribed, $bExisten);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public static function NewNonExistenInstance(string $sFullNameRaw, string $sDelimiter) : self
	{
		return self::NewInstance(
			\MailSo\Imap\Folder::NewInstance($sFullNameRaw, $sDelimiter, array('\NoSelect')), true, false);
	}

	public function Name() : string
	{
		return \MailSo\Base\Utils::ConvertEncoding($this->NameRaw(),
			\MailSo\Base\Enumerations\Charset::UTF_7_IMAP,
			\MailSo\Base\Enumerations\Charset::UTF_8);
	}

	public function FullName() : string
	{
		return \MailSo\Base\Utils::ConvertEncoding($this->FullNameRaw(),
			\MailSo\Base\Enumerations\Charset::UTF_7_IMAP,
			\MailSo\Base\Enumerations\Charset::UTF_8);
	}

	public function NameRaw() : string
	{
		return $this->oImapFolder->NameRaw();
	}

	public function FullNameRaw() : string
	{
		return $this->oImapFolder->FullNameRaw();
	}

	public function ParentFullName() : string
	{
		return \MailSo\Base\Utils::ConvertEncoding($this->sParentFullNameRaw,
			\MailSo\Base\Enumerations\Charset::UTF_7_IMAP,
			\MailSo\Base\Enumerations\Charset::UTF_8);
	}

	public function ParentFullNameRaw() : string
	{
		return $this->sParentFullNameRaw;
	}

	public function Delimiter() : string
	{
		return $this->oImapFolder->Delimiter();
	}

	public function Flags() : array
	{
		return $this->oImapFolder->Flags();
	}

	public function FlagsLowerCase() : array
	{
		return $this->oImapFolder->FlagsLowerCase();
	}

	public function SubFolders(bool $bCreateIfNull = false) : ?\MailSo\Mail\FolderCollection
	{
		if ($bCreateIfNull && !$this->oSubFolders)
		{
			$this->oSubFolders = FolderCollection::NewInstance();
		}

		return $this->oSubFolders;
	}

	public function HasSubFolders() : bool
	{
		return $this->oSubFolders && 0 < $this->oSubFolders->Count();
	}

	public function HasVisibleSubFolders() : bool
	{
		$sList = array();
		if ($this->oSubFolders)
		{
			$sList = $this->oSubFolders->FilterList(function (\MailSo\Mail\Folder $oFolder) {
				return $oFolder->IsSubscribed();
			});
		}

		return 0 < \count($sList);
	}

	public function IsSubscribed() : bool
	{
		return $this->bSubscribed;
	}

	public function IsExists() : bool
	{
		return $this->bExisten;
	}

	public function IsSelectable() : bool
	{
		return $this->IsExists() && $this->oImapFolder->IsSelectable();
	}

	/**
	 * @return mixed
	 */
	public function Status()
	{
		return $this->oImapFolder->GetExtended('STATUS');
	}

	public function IsInbox() : bool
	{
		return $this->oImapFolder->IsInbox();
	}

	public function GetFolderListType() : int
	{
		$aFlags = $this->oImapFolder->FlagsLowerCase();
		$iListType = \MailSo\Imap\Enumerations\FolderType::USER;

		if (\is_array($aFlags))
		{
			switch (true)
			{
				case \in_array('\inbox', $aFlags) || 'INBOX' === \strtoupper($this->FullNameRaw()):
					$iListType = \MailSo\Imap\Enumerations\FolderType::INBOX;
					break;
				case \in_array('\sent', $aFlags):
				case \in_array('\sentmail', $aFlags):
					$iListType = \MailSo\Imap\Enumerations\FolderType::SENT;
					break;
				case \in_array('\drafts', $aFlags):
					$iListType = \MailSo\Imap\Enumerations\FolderType::DRAFTS;
					break;
				case \in_array('\junk', $aFlags):
				case \in_array('\spam', $aFlags):
					$iListType = \MailSo\Imap\Enumerations\FolderType::JUNK;
					break;
				case \in_array('\trash', $aFlags):
				case \in_array('\bin', $aFlags):
					$iListType = \MailSo\Imap\Enumerations\FolderType::TRASH;
					break;
				case \in_array('\important', $aFlags):
					$iListType = \MailSo\Imap\Enumerations\FolderType::IMPORTANT;
					break;
				case \in_array('\flagged', $aFlags):
				case \in_array('\starred', $aFlags):
					$iListType = \MailSo\Imap\Enumerations\FolderType::FLAGGED;
					break;
				case \in_array('\all', $aFlags):
				case \in_array('\allmail', $aFlags):
				case \in_array('\archive', $aFlags):
					$iListType = \MailSo\Imap\Enumerations\FolderType::ALL;
					break;
			}
		}

		return $iListType;
	}
}
