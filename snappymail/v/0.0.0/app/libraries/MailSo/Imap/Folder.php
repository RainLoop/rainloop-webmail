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

	private array $aAttributes;

	/**
	 * RFC 5464
	 */
	private array $aMetadata = array();

	/**
	 * @throws \InvalidArgumentException
	 */
	function __construct(string $sFullName, string $sDelimiter = null, array $aAttributes = array())
	{
		if (!\strlen($sFullName)) {
			throw new \InvalidArgumentException;
		}
		$this->FullName = $sFullName;
		$this->setDelimiter($sDelimiter);
		$this->setAttributes($aAttributes);
/*
		// RFC 5738
		if (\in_array('\\noutf8', $this->aAttributes)) {
		}
		if (\in_array('\\utf8only', $this->aAttributes)) {
		}
*/
	}

	public function setAttributes(array $aAttributes) : void
	{
		$this->aAttributes = \array_map('mb_strtolower', $aAttributes);
	}

	public function setSubscribed() : void
	{
		$this->aAttributes = \array_unique(\array_merge($this->aAttributes, ['\\subscribed']));
	}

	public function setDelimiter(?string $sDelimiter) : void
	{
		$this->sDelimiter = $sDelimiter;
	}

	public function Name() : string
	{
		$sNameRaw = $this->FullName;
		if ($this->sDelimiter) {
			$aNames = \explode($this->sDelimiter, $sNameRaw);
			return \end($aNames);
		}
		return $sNameRaw;
	}

	public function Delimiter() : ?string
	{
		return $this->sDelimiter;
	}

	public function Selectable() : bool
	{
		return !\in_array('\\noselect', $this->aAttributes)
			&& !\in_array('\\nonexistent', $this->aAttributes);
	}

	public function IsSubscribed() : bool
	{
		return \in_array('\\subscribed', $this->aAttributes);
	}

	public function IsInbox() : bool
	{
		return 'INBOX' === \strtoupper($this->FullName) || \in_array('\\inbox', $this->aAttributes);
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
			], $this->aAttributes);
			if ($match) {
				$role = \array_shift($match);
			}
			if (!$role && 'INBOX' === \strtoupper($this->FullName)) {
				return 'inbox';
			}
		}
		return $role ? \ltrim($role, '\\') : null;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
/*
		if ($this->ImapClient->hasCapability('ACL') || $this->ImapClient->CapabilityValue('RIGHTS')) {
			// MailSo\Imap\Responses\ACL
			$rights = $this->ImapClient->FolderMyRights($this->FullName);
		}
*/
		$result = array(
			'@Object' => 'Object/Folder',
			'name' => $this->Name(),
			'fullName' => $this->FullName,
			'delimiter' => (string) $this->sDelimiter,
			'attributes' => $this->aAttributes,
			'metadata' => $this->aMetadata,
			'uidNext' => $this->UIDNEXT,
			// https://datatracker.ietf.org/doc/html/rfc8621#section-2
			'totalEmails' => $this->MESSAGES,
			'unreadEmails' => $this->UNSEEN,
			'id' => $this->MAILBOXID,
			'size' => $this->SIZE,
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
		if ($this->etag) {
			$result['etag'] = $this->etag;
		}
		return $result;
	}
}
