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

use MailSo\Imap\Enumerations\MetadataKeys;

/**
 * @category MailSo
 * @package Imap
 */
class Folder implements \JsonSerializable
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

	public function setSubscribed() : void
	{
		$this->aFlagsLowerCase = \array_unique(\array_merge($this->aFlagsLowerCase, ['\\subscribed']));
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

	public function Exists() : bool
	{
		return !\in_array('\\nonexistent', $this->aFlagsLowerCase);
	}

	public function Selectable() : bool
	{
		return !\in_array('\\noselect', $this->aFlagsLowerCase) && $this->Exists();
	}

	public function IsSubscribed() : bool
	{
		return \in_array('\\subscribed', $this->aFlagsLowerCase);
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

	// JMAP RFC 8621
	public function Role() : ?string
	{
		$role = \strtolower($this->GetMetadata(MetadataKeys::SPECIALUSE) ?: '');
		if (!$role) {
			$match = \array_intersect([
				'\\inbox',
				'\\all',       // '\\allmail'
				'\\archive',
				'\\drafts',
				'\\flagged',   // '\\starred'
				'\\important',
				'\\junk',      // '\\spam'
				'\\sent',      // '\\sentmail'
				'\\trash',     // '\\bin'
			], $this->aFlagsLowerCase);
			if ($match) {
				$role = \array_shift($match);
			}
			if (!$role && 'INBOX' === \strtoupper($this->FolderName)) {
				return 'inbox';
			}
		}
		return $role ? \ltrim($role, '\\') : null;
	}

	public function Hash(string $sClientHash) : ?string
	{
		return $this->getETag($sClientHash);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
/*
		$aExtended = null;
		if (isset($this->MESSAGES, $this->UNSEEN, $this->UIDNEXT)) {
			$aExtended = array(
				'totalEmails' => (int) $this->MESSAGES,
				'unreadEmails' => (int) $this->UNSEEN,
				'uidNext' => (int) $this->UIDNEXT,
//				'etag' => $this->Hash($this->ImapClient()->Hash())
			);
		}
*/
/*
		if ($this->ImapClient->hasCapability('ACL') || $this->ImapClient->CapabilityValue('RIGHTS')) {
			// MailSo\Imap\Responses\ACL
			$rights = $this->ImapClient->FolderMyRights($this->FolderName);
		}
*/
		return array(
			'@Object' => 'Object/Folder',
			'name' => $this->Name(),
			'fullName' => $this->FolderName,
			'delimiter' => (string) $this->sDelimiter,
			'isSubscribed' => $this->IsSubscribed(),
			'exists' => $this->Exists(),
			'selectable' => $this->Selectable(),
			'flags' => $this->aFlagsLowerCase,
//			'extended' => $aExtended,
//			'permanentFlags' => $this->PermanentFlags,
			'metadata' => $this->aMetadata,
			'uidNext' => $this->UIDNEXT,
			// https://datatracker.ietf.org/doc/html/rfc8621#section-2
			'totalEmails' => $this->MESSAGES,
			'unreadEmails' => $this->UNSEEN,
			'id' => $this->MAILBOXID,
			'role' => $this->Role()
/*
			'myRights' => [
				'mayReadItems'   => !$rights || ($rights->hasRight('l') && $rights->hasRight('r')),
				'mayAddItems'    => !$rights || $rights->hasRight('i'),
				'mayRemoveItems' => !$rights || ($rights->hasRight('t') && $rights->hasRight('e')),
				'maySetSeen'     => !$rights || $rights->hasRight('s'),
				'maySetKeywords' => !$rights || $rights->hasRight('w'),
				'mayCreateChild' => !$rights || $rights->hasRight('k'),
				'mayRename'      => !$rights || $rights->hasRight('x'),
				'mayDelete'      => !$rights || $rights->hasRight('x'),
				'maySubmit'      => !$rights || $rights->hasRight('p')
			]
*/
		);
	}
}
