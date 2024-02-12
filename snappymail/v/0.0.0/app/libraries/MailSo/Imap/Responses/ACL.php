<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Responses;

/**
 * @category MailSo
 * @package Imap
 */
class ACL implements \JsonSerializable
{
	private array $rights;

	function __construct(array $rights)
	{
		$this->rights = $rights;
	}

	/** PHP 8.1
	public function hasRight(string|\MailSo\Imap\Enumerations\FolderACL $right)
	{
		if ($right instanceof \BackedEnum) {
			return \in_array($right->value, $this->rights);
		}
	*/
	public function hasRight(string $right) : bool
	{
		$const = '\\MailSo\\Imap\\Enumerations\\FolderACL::' . \strtoupper($right);
		if (\defined($const)) {
			$right = \constant($const);
		}
		return \in_array($right, $this->rights);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return [
			'mayReadItems'   => ($this->hasRight('l') && $this->hasRight('r')),
			'mayAddItems'    => $this->hasRight('i'),
			'mayRemoveItems' => ($this->hasRight('t') && $this->hasRight('e')),
			'maySetSeen'     => $this->hasRight('s'),
			'maySetKeywords' => $this->hasRight('w'),
			'mayCreateChild' => $this->hasRight('k'),
			'mayRename'      => $this->hasRight('x'),
			'mayDelete'      => $this->hasRight('x'),
			'maySubmit'      => $this->hasRight('p'),
			'raw' => \implode('', $this->rights)
		];
	}

}
