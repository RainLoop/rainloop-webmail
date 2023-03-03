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

	public string $etag = '';

	public bool $IsWritable;

	/**
	 * Message flags
	 */
	public array $Flags = array();

	/**
	 * NOTE: Empty when FolderExamine is used
	 */
	public array $PermanentFlags = array();

	function __construct(string $sFullName, bool $bIsWritable)
	{
		$this->FullName = $sFullName;
		$this->IsWritable = $bIsWritable;
	}

	public function generateETag(ImapClient $oImapClient) : void
	{
		$this->etag = $this->getETag($oImapClient->Hash());
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
			'name' => $this->FullName,
			'flags' => $this->Flags,
			'permanentFlags' => $this->PermanentFlags,
			'uidNext' => $this->UIDNEXT,
			'uidValidity' => $this->UIDVALIDITY
		);
		if (isset($this->MESSAGES)) {
			$result['totalEmails'] = $this->MESSAGES;
			$result['unreadEmails'] = $this->UNSEEN;
		}
		if (isset($this->HIGHESTMODSEQ)) {
			$result['highestModSeq'] = $this->HIGHESTMODSEQ;
		}
		if (isset($this->APPENDLIMIT)) {
			$result['appendLimit'] = $this->APPENDLIMIT;
		}
		if (isset($this->SIZE)) {
			$result['size'] = $this->SIZE;
		}
		if (isset($this->etag)) {
			$result['etag'] = $this->etag;
		}
		return $result;
	}
}
