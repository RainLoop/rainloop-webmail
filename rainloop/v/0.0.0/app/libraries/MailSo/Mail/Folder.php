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
	 * @access private
	 *
	 * @param \MailSo\Imap\Folder $oImapFolder
	 * @param bool $bSubscribed = true
	 * @param bool $bExisten = true
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	private function __construct($oImapFolder, $bSubscribed = true, $bExisten = true)
	{
		if ($oImapFolder instanceof \MailSo\Imap\Folder)
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
		else
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}
	}

	/**
	 * @param \MailSo\Imap\Folder $oImapFolder
	 * @param bool $bSubscribed = true
	 * @param bool $bExisten = true
	 *
	 * @return \MailSo\Mail\Folder
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public static function NewInstance($oImapFolder, $bSubscribed = true, $bExisten = true)
	{
		return new self($oImapFolder, $bSubscribed, $bExisten);
	}

	/**
	 * @param string $sFullNameRaw
	 * @param string $sDelimiter
	 *
	 * @return \MailSo\Mail\Folder
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public static function NewNonExistenInstance($sFullNameRaw, $sDelimiter)
	{
		return self::NewInstance(
			\MailSo\Imap\Folder::NewInstance($sFullNameRaw, $sDelimiter, array('\NoSelect')), true, false);
	}

	/**
	 * @return string
	 */
	public function Name()
	{
		return \MailSo\Base\Utils::ConvertEncoding($this->NameRaw(),
			\MailSo\Base\Enumerations\Charset::UTF_7_IMAP,
			\MailSo\Base\Enumerations\Charset::UTF_8);
	}

	/**
	 * @return string
	 */
	public function FullName()
	{
		return \MailSo\Base\Utils::ConvertEncoding($this->FullNameRaw(),
			\MailSo\Base\Enumerations\Charset::UTF_7_IMAP,
			\MailSo\Base\Enumerations\Charset::UTF_8);
	}

	/**
	 * @return string
	 */
	public function NameRaw()
	{
		return $this->oImapFolder->NameRaw();
	}

	/**
	 * @return string
	 */
	public function FullNameRaw()
	{
		return $this->oImapFolder->FullNameRaw();
	}

	/**
	 * @return string
	 */
	public function ParentFullName()
	{
		return \MailSo\Base\Utils::ConvertEncoding($this->sParentFullNameRaw,
			\MailSo\Base\Enumerations\Charset::UTF_7_IMAP,
			\MailSo\Base\Enumerations\Charset::UTF_8);
	}

	/**
	 * @return string
	 */
	public function ParentFullNameRaw()
	{
		return $this->sParentFullNameRaw;
	}

	/**
	 * @return string
	 */
	public function Delimiter()
	{
		return $this->oImapFolder->Delimiter();
	}

	/**
	 * @return array
	 */
	public function Flags()
	{
		return $this->oImapFolder->Flags();
	}

	/**
	 * @return array
	 */
	public function FlagsLowerCase()
	{
		return $this->oImapFolder->FlagsLowerCase();
	}

	/**
	 * @param bool $bCreateIfNull = false
	 * @return \MailSo\Mail\FolderCollection
	 */
	public function SubFolders($bCreateIfNull = false)
	{
		if ($bCreateIfNull && !$this->oSubFolders)
		{
			$this->oSubFolders = FolderCollection::NewInstance();
		}

		return $this->oSubFolders;
	}

	/**
	 * @return bool
	 */
	public function HasSubFolders()
	{
		return $this->oSubFolders && 0 < $this->oSubFolders->Count();
	}

	/**
	 * @return bool
	 */
	public function HasVisibleSubFolders()
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

	/**
	 * @return bool
	 */
	public function IsSubscribed()
	{
		return $this->bSubscribed;
	}

	/**
	 * @return bool
	 */
	public function IsExists()
	{
		return $this->bExisten;
	}

	/**
	 * @return bool
	 */
	public function IsSelectable()
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

	/**
	 * @return bool
	 */
	public function IsInbox()
	{
		return $this->oImapFolder->IsInbox();
	}

	/**
	 * @return int
	 */
	public function GetFolderListType()
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
