<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Traits;

/**
 * @category MailSo
 * @package Imap
 * @subpackage Traits
 *
 * https://datatracker.ietf.org/doc/html/rfc3501#section-6.3.10
 * https://datatracker.ietf.org/doc/html/rfc4551#section-3.6
 * https://datatracker.ietf.org/doc/html/rfc8474#section-4
 */
trait Status
{
	public string $FullName;

	public bool $hasStatus = false;

	/**
	 * The number of messages in the mailbox.
	 * This response is named EXISTS as a result of a SELECT or EXAMINE command.
	 */
	public ?int $MESSAGES = null;

	/**
	 * The number of messages with the \Recent flag set.
	 * This response also occurs as a result of a SELECT or EXAMINE command.
	 * IMAP4rev2 deprecated.
	 */
	public ?int $RECENT = null;

	/**
	 * The next unique identifier value of the mailbox.
	 * A 32-bit value
	 * This response also occurs as a result of a SELECT or EXAMINE command.
	 */
	public ?int $UIDNEXT = null;

	/**
	 * The unique identifier validity value of the mailbox.
	 * This response also occurs as a result of a SELECT or EXAMINE command.
	 */
	public ?int $UIDVALIDITY = null;

	/**
	 * The number of messages which do not have the \Seen flag set.
	 * This response also occurs as a result of a IMAP4rev1 SELECT or EXAMINE command,
	 * but then it is the message sequence number of the first unseen message.
	 * IMAP4rev2 deprecated on SELECT/EXAMINE.
	 */
	public ?int $UNSEEN = null;

	/**
	 * RFC 4551
	 * The highest mod-sequence value of all messages in the mailbox.
	 * This response also occurs as a result of a SELECT or EXAMINE command.
	 * 1*DIGIT Positive unsigned 64-bit integer
	 */
	public ?int $HIGHESTMODSEQ = null;

	/**
	 * RFC 7889
	 * Message upload size limit.
	 */
	public ?int $APPENDLIMIT = null;

	/**
	 * RFC 8474
	 * A server-allocated unique identifier for the mailbox.
	 * This response also occurs as a result of a CREATE, SELECT or EXAMINE command.
	 */
	public ?string $MAILBOXID = null;

	/**
	 * RFC 9051
	 * The total size of the mailbox in octets.
	 */
	public ?int $SIZE = null;

	public ?string $etag = null;
	public function generateETag(\MailSo\Imap\ImapClient $oImapClient) : void
	{
		if (!$this->hasStatus) {
			// UNSEEN undefined when only SELECT/EXAMINE is used
			\error_log("{$this->FullName} STATUS missing " . \print_r(\debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS),true));
			return;
		}
		if (!isset($this->MESSAGES, $this->UIDNEXT)) {
			return;
		}
		$this->etag = \md5('FolderHash/'. \implode('-', [
			$this->FullName,
			$this->MESSAGES,
			$this->UIDNEXT,
			$this->UIDVALIDITY,
			$this->UNSEEN,
			$this->HIGHESTMODSEQ,
			$oImapClient->Hash()
		]));
	}

	private function setStatusItem(string $name, $value) : bool
	{
		if ('EXISTS' === $name) {
			$name = 'MESSAGES';
		} else if ('X-GUID' === $name) {
			$name = 'MAILBOXID';
		}
		if (\property_exists(__TRAIT__, $name)) {
			if ('MAILBOXID' !== $name) {
				$value = (int) $value;
			}
			$this->$name = $value;
			return true;
		}
		return false;
	}

	/**
	 * SELECT  https://datatracker.ietf.org/doc/html/rfc3501#section-6.3.1
	 * EXAMINE https://datatracker.ietf.org/doc/html/rfc3501#section-6.3.2
	 * STATUS  https://datatracker.ietf.org/doc/html/rfc3501#section-6.3.10
	 *
	 * selectOrExamineFolder
	 *        ResponseList[2] => EXISTS | RECENT
	 *        OptionalResponse[0] => UNSEEN
	 * FolderStatus
	 *        OptionalResponse[0] => HIGHESTMODSEQ
	 *        ResponseList[1] => STATUS
	 * getFoldersResult LIST-EXTENDED
	 *        ResponseList[1] => STATUS
	 */
	public function setStatusFromResponse(\MailSo\Imap\Response $oResponse) : bool
	{
		$bResult = false;

		// OK untagged responses
		if (\is_array($oResponse->OptionalResponse)) {
			if (\count($oResponse->OptionalResponse) > 1) {
				$bResult = $this->setStatusItem($oResponse->OptionalResponse[0], $oResponse->OptionalResponse[1]);
			}
		}

		// untagged responses
		else if (\count($oResponse->ResponseList) > 2) {
			// LIST or STATUS command
			if ('STATUS' === $oResponse->ResponseList[1]
			 && isset($oResponse->ResponseList[3])
			 && \is_array($oResponse->ResponseList[3])) {
				$c = \count($oResponse->ResponseList[3]);
				for ($i = 0; $i < $c; $i += 2) {
					$bResult |= $this->setStatusItem(
						$oResponse->ResponseList[3][$i],
						$oResponse->ResponseList[3][$i+1]
					);
				}
				$this->hasStatus = $bResult;
			}
			// SELECT or EXAMINE command
			else if (\is_numeric($oResponse->ResponseList[1]) && \is_string($oResponse->ResponseList[2])) {
				// UNSEEN deprecated in IMAP4rev2
				if ('UNSEEN' !== $oResponse->ResponseList[2]) {
					$bResult |= $this->setStatusItem($oResponse->ResponseList[2], $oResponse->ResponseList[1]);
				}
			}
		}

		return $bResult;
	}

}
