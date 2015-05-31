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
	 * @var string
	 */
	public $UidNext;

	/**
	 * @var string
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

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		parent::__construct();

		$this->Clear();
	}

	/**
	 * @return \MailSo\Mail\MessageCollection
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return \MailSo\Mail\MessageCollection
	 */
	public function Clear()
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
		$this->UidNext = '';
		$this->ThreadUid = '';
		$this->NewMessages = array();

		$this->Filtered = false;

		return $this;
	}
}
