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

	/**
	 * https://datatracker.ietf.org/doc/html/rfc3501#section-7.3.1
	 * @var int
	 */
	public $Exists = null;

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

	public function jsonSerialize()
	{
		return array(
			'Name' => $this->FolderName,
			'Flags' => $this->Flags,
			'PermanentFlags' => $this->PermanentFlags,
/*
			'Messages' => $this->MESSAGES,
			'Unseen' => $this->UNSEEN,
			'Recent'        => $this->RECENT,
			'UidNext'       => $this->UIDNEXT,
			'UidValidity'   => $this->UIDVALIDITY,
			'Highestmodseq' => $this->HIGHESTMODSEQ,
			'Appendlimit'   => $this->APPENDLIMIT,
			'Mailboxid'     => $this->MAILBOXID,
*/
		);
	}
}
