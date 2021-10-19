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
class FolderInformation
{
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
	 */
	public $Flags = array();

	/**
	 * @var array
	 */
	public $PermanentFlags = array();

	/**
	 * https://datatracker.ietf.org/doc/html/rfc3501#section-7.3.1
	 * @var int
	 */
	public $Exists = null;

	/**
	 * https://datatracker.ietf.org/doc/html/rfc3501#section-7.3.2
	 * @var int
	 */
	public $Recent = null;

	/**
	 * rfc3501 2.3.1.1
	 * A 32-bit value
	 * @var int
	 */
	public $Uidvalidity = null;

	/**
	 * @var int
	 */
	public $Unread = null;

	/**
	 * rfc3501 2.3.1.1
	 * A 32-bit value
	 * @var int
	 */
	public $Uidnext = null;

	/**
	 * rfc4551
	 * 1*DIGIT Positive unsigned 64-bit integer
	 * @var int
	 */
	public $HighestModSeq = null;

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
}
