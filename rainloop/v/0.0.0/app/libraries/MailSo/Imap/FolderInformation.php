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
	public $Flags;

	/**
	 * @var array
	 */
	public $PermanentFlags;

	/**
	 * @var int
	 */
	public $Exists;

	/**
	 * @var int
	 */
	public $Recent;

	/**
	 * @var string
	 */
	public $Uidvalidity;

	/**
	 * @var int
	 */
	public $Unread;

	/**
	 * @var string
	 */
	public $Uidnext;

	/**
	 * @var string
	 */
	public $HighestModSeq;

	/**
	 * @access private
	 *
	 * @param string $sFolderName
	 * @param bool $bIsWritable
	 */
	private function __construct($sFolderName, $bIsWritable)
	{
		$this->FolderName = $sFolderName;
		$this->IsWritable = $bIsWritable;
		$this->Exists = null;
		$this->Recent = null;
		$this->Flags = array();
		$this->PermanentFlags = array();

		$this->Unread = null;
		$this->Uidnext = null;
		$this->HighestModSeq = null;
	}

	/**
	 * @param string $sFolderName
	 * @param bool $bIsWritable
	 *
	 * @return \MailSo\Imap\FolderInformation
	 */
	public static function NewInstance($sFolderName, $bIsWritable)
	{
		return new self($sFolderName, $bIsWritable);
	}

	/**
	 * @param string $sFlag
	 *
	 * @return bool
	 */
	public function IsFlagSupported($sFlag)
	{
		return \in_array('\\*', $this->PermanentFlags) ||
			\in_array($sFlag, $this->PermanentFlags) ||
			\in_array($sFlag, $this->Flags);
	}
}
