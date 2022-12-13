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
	public string $FolderName;

	public
		/**
		 * The number of messages in the mailbox.
		 * This response is named EXISTS as a result of a SELECT or EXAMINE command.
		 * @var int
		 */
		$MESSAGES,

		/**
		 * The number of messages with the \Recent flag set.
		 * This response also occurs as a result of a SELECT or EXAMINE command.
		 * IMAP4rev2 deprecated.
		 * @var int
		 */
		$RECENT,

		/**
		 * The next unique identifier value of the mailbox.
		 * A 32-bit value
		 * This response also occurs as a result of a SELECT or EXAMINE command.
		 * @var int
		 */
		$UIDNEXT,

		/**
		 * The unique identifier validity value of the mailbox.
		 * This response also occurs as a result of a SELECT or EXAMINE command.
		 * @var int
		 */
		$UIDVALIDITY,

		/**
		 * The number of messages which do not have the \Seen flag set.
		 * This response also occurs as a result of a IMAP4rev1 SELECT or EXAMINE command,
		 * but then it is the message sequence number of the first unseen message.
		 * IMAP4rev2 deprecated on SELECT/EXAMINE.
		 * @var int
		 */
		$UNSEEN,

		/**
		 * RFC 4551
		 * The highest mod-sequence value of all messages in the mailbox.
		 * This response also occurs as a result of a SELECT or EXAMINE command.
		 * @var int 1*DIGIT Positive unsigned 64-bit integer
		 */
		$HIGHESTMODSEQ,

		/**
		 * RFC 7889
		 * Message upload size limit.
		 * @var int
		 */
		$APPENDLIMIT,

		/**
		 * RFC 8474
		 * A server-allocated unique identifier for the mailbox.
		 * This response also occurs as a result of a CREATE, SELECT or EXAMINE command.
		 * @var string
		 */
		$MAILBOXID,

		/**
		 * RFC 9051
		 * The total size of the mailbox in octets.
		 * @var int
		 */
		$SIZE;

	public function getHash(string $sClientHash) : ?string
	{
		if (!isset($this->MESSAGES, $this->UIDNEXT)) {
			return null;
		}
		return \md5('FolderHash/'. \implode('-', [
				$this->FolderName,
				$this->MESSAGES,
				$this->UIDNEXT,
				$this->UIDVALIDITY,
//				$this->UNSEEN, // undefined when SELECT/EXAMINE
				$this->HIGHESTMODSEQ,
				$sClientHash
		]));
	}

	public function setStatus(string $name, $value) : bool
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
				$bResult = $this->setStatus($oResponse->OptionalResponse[0], $oResponse->OptionalResponse[1]);
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
					$bResult |= $this->setStatus(
						$oResponse->ResponseList[3][$i],
						$oResponse->ResponseList[3][$i+1]
					);
				}
			}
			// SELECT or EXAMINE command
			else if (\is_numeric($oResponse->ResponseList[1]) && \is_string($oResponse->ResponseList[2])) {
				// UNSEEN deprecated in IMAP4rev2
				if ('UNSEEN' !== $oResponse->ResponseList[2]) {
					$bResult |= $this->setStatus($oResponse->ResponseList[2], $oResponse->ResponseList[1]);
				}
			}
		}

		return $bResult;
	}

}
