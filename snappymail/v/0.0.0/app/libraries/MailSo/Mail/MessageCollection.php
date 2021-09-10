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
class MessageCollection extends \MailSo\Base\Collection
{
	/**
	 * @var string
	 */
	public $FolderHash;

	/**
	 * @var int
	 */
	public $MessageCount;

	/**
	 * @var int
	 */
	public $MessageUnseenCount;

	/**
	 * @var int
	 */
	public $MessageResultCount;

	/**
	 * @var string
	 */
	public $FolderName;

	/**
	 * @var int
	 */
	public $Offset;

	/**
	 * @var int
	 */
	public $Limit;

	/**
	 * @var string
	 */
	public $Search;

	/**
	 * @var int
	 */
	public $UidNext;

	/**
	 * @var int
	 */
	public $ThreadUid;

	/**
	 * @var array
	 */
	public $NewMessages;

	/**
	 * @var bool
	 */
	public $Filtered;

	function __construct()
	{
		parent::__construct();

		$this->Clear();
	}

	public function append($oMessage, bool $bToTop = false) : void
	{
		assert($oMessage instanceof Message);
		parent::append($oMessage, $bToTop);
	}

	public function Clear() : void
	{
		parent::Clear();

		$this->FolderHash = '';

		$this->MessageCount = 0;
		$this->MessageUnseenCount = 0;
		$this->MessageResultCount = 0;

		$this->FolderName = '';
		$this->Offset = 0;
		$this->Limit = 0;
		$this->Search = '';
		$this->UidNext = 0;
		$this->ThreadUid = 0;
		$this->NewMessages = array();

		$this->Filtered = false;
	}

	public function jsonSerialize()
	{
		return array_merge(parent::jsonSerialize(), array(
			'MessageCount' => $this->MessageCount,
			'MessageUnseenCount' => $this->MessageUnseenCount,
			'MessageResultCount' => $this->MessageResultCount,
			'Folder' => $this->FolderName,
			'FolderHash' => $this->FolderHash,
			'UidNext' => $this->UidNext,
			'ThreadUid' => $this->ThreadUid,
			'NewMessages' => $this->NewMessages,
			'Filtered' => $this->Filtered,
			'Offset' => $this->Offset,
			'Limit' => $this->Limit,
			'Search' => $this->Search
		));
	}
}
