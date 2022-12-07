<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Imap
 */
class Folder
{
	// RFC5258 Response data STATUS items when using LIST-EXTENDED
	use Traits\Status;

	private ?string $sDelimiter;

	private array $aFlagsLowerCase;

	/**
	 * RFC 5464
	 */
	private array $aMetadata = array();

	/**
	 * @throws \InvalidArgumentException
	 */
	function __construct(string $sFullName, string $sDelimiter = null, array $aFlags = array())
	{
		if (!\strlen($sFullName)) {
			throw new \InvalidArgumentException;
		}
		$this->FolderName = $sFullName;
		$this->setDelimiter($sDelimiter);
		$this->setFlags($aFlags);
/*
		// RFC 5738
		if (\in_array('\\noutf8', $this->aFlagsLowerCase)) {
		}
		if (\in_array('\\utf8only', $this->aFlagsLowerCase)) {
		}
*/
	}

	public function setFlags(array $aFlags) : void
	{
		$this->aFlagsLowerCase = \array_map('mb_strtolower', $aFlags);
	}

	public function setDelimiter(?string $sDelimiter) : void
	{
		$this->sDelimiter = $sDelimiter;
	}

	public function Name() : string
	{
		$sNameRaw = $this->FolderName;
		if ($this->sDelimiter) {
			$aNames = \explode($this->sDelimiter, $sNameRaw);
			return \end($aNames);
		}
		return $sNameRaw;
	}

	public function FullName() : string
	{
		return $this->FolderName;
	}

	public function Delimiter() : ?string
	{
		return $this->sDelimiter;
	}

	public function FlagsLowerCase() : array
	{
		return $this->aFlagsLowerCase;
	}

	public function IsSelectable() : bool
	{
		return !\in_array('\\noselect', $this->aFlagsLowerCase) && !\in_array('\\nonexistent', $this->aFlagsLowerCase);
	}

	public function IsInbox() : bool
	{
		return 'INBOX' === \strtoupper($this->FolderName) || \in_array('\\inbox', $this->aFlagsLowerCase);
	}

	public function SetMetadata(string $sName, string $sData) : void
	{
		$this->aMetadata[$sName] = $sData;
	}

	public function SetAllMetadata(array $aMetadata) : void
	{
		$this->aMetadata = $aMetadata;
	}

	public function GetMetadata(string $sName) : ?string
	{
		return isset($this->aMetadata[$sName]) ? $this->aMetadata[$sName] : null;
	}

	public function Metadata() : array
	{
		return $this->aMetadata;
	}
}
