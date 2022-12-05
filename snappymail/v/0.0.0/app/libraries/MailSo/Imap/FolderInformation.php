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
class FolderInformation implements \JsonSerializable
{
	use Traits\Status;

	/**
	 * @var string
	 */
	public $FolderName;

	/**
	 * @var bool
	 */
	public $IsWritable;

	/**
	 * @var array
	 * Message flags
	 */
	public $Flags = array();

	/**
	 * @var array
	 * NOTE: Empty when FolderExamine is used
	 */
	public $PermanentFlags = array();

	function __construct(string $sFolderName, bool $bIsWritable)
	{
		$this->FolderName = $sFolderName;
		$this->IsWritable = $bIsWritable;
	}

	public function IsFlagSupported(string $sFlag) : bool
	{
		return \in_array('\\*', $this->PermanentFlags) ||
			\in_array($sFlag, $this->PermanentFlags) ||
			\in_array($sFlag, $this->Flags);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$result = array(
			'id' => $this->MAILBOXID,
			'Name' => $this->FolderName,
			'Flags' => $this->Flags,
			'PermanentFlags' => $this->PermanentFlags,
			'UidNext' => $this->UIDNEXT,
			'UidValidity' => $this->UIDVALIDITY
		);
		if (isset($this->MESSAGES)) {
			$result['totalEmails'] = $this->MESSAGES;
			$result['unreadEmails'] = $this->UNSEEN;
		}
		if (isset($this->HIGHESTMODSEQ)) {
			$result['HighestModSeq'] = $this->HIGHESTMODSEQ;
		}
		if (isset($this->APPENDLIMIT)) {
			$result['Appendlimit'] = $this->APPENDLIMIT;
		}
		if (isset($this->SIZE)) {
			$result['Size'] = $this->SIZE;
		}
		return $result;
	}
}
