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

	public bool $IsWritable;

	/**
	 * Message flags
	 * https://www.rfc-editor.org/rfc/rfc3501#section-7.2.6
	 * These could be not permanent so we don't use them
	 */
	public array $Flags = array();

	/**
	 * NOTE: Empty when FolderExamine is used
	 * https://www.rfc-editor.org/rfc/rfc3501#page-64
	 */
	public array $PermanentFlags = array();

	function __construct(string $sFullName, bool $bIsWritable)
	{
		$this->FullName = $sFullName;
		$this->IsWritable = $bIsWritable;
	}

	public function IsFlagSupported(string $sFlag) : bool
	{
		return \in_array('\\*', $this->PermanentFlags)
			|| \in_array($sFlag, $this->PermanentFlags);
//			|| \in_array($sFlag, $this->Flags);
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$result = array(
			'id' => $this->MAILBOXID,
			'name' => $this->FullName,
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
		if ($this->etag) {
			$result['etag'] = $this->etag;
		}
/*
		if ($this->Flags) {
			$result['flags'] = $this->Flags;
		}
*/
		if ($this->PermanentFlags) {
			$result['permanentFlags'] = $this->PermanentFlags;
		}
		return $result;
	}
}
