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
	 * Amount of UIDs in this list (could be less then total messages when using threads)
	 */
	public int $totalEmails = 0;

	public ?int $totalThreads = null;

	public string $FolderName = '';

	public int $Offset = 0;

	public int $Limit = 0;

	public string $Search = '';

	public int $ThreadUid = 0;

	// MailSo\Imap\FolderInformation
	public $FolderInfo = null;

	public array $NewMessages = array();

//	public bool $Filtered = false;

	public bool $Limited = false;

	public function append($oMessage, bool $bToTop = false) : void
	{
		assert($oMessage instanceof Message);
		parent::append($oMessage, $bToTop);
	}

	public function Clear() : void
	{
		throw new \BadMethodCallException('disallowed');
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array_merge(parent::jsonSerialize(), array(
			'totalEmails' => $this->totalEmails,
			'totalThreads' => $this->totalThreads,
			'threadUid' => $this->ThreadUid,
			'newMessages' => $this->NewMessages,
//			'filtered' => $this->Filtered,
			'offset' => $this->Offset,
			'limit' => $this->Limit,
			'search' => $this->Search,
			'limited' => $this->Limited,
			'folder' => $this->FolderInfo
		));
	}
}
