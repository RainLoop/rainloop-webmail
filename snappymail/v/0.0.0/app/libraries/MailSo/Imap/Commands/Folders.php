<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Commands;

use MailSo\Imap\Folder;
use MailSo\Imap\FolderCollection;
use MailSo\Imap\FolderInformation;
use MailSo\Imap\SequenceSet;
use MailSo\Imap\Enumerations\FolderStatus;
use MailSo\Imap\Enumerations\MessageFlag;
use MailSo\Imap\Enumerations\StoreAction;

/**
 * @category MailSo
 * @package Imap
 */
trait Folders
{
	/**
	 * @throws \InvalidArgumentException
	 */
	public function FolderClear(string $sFolderFullName) : void
	{
		if (0 < $this->FolderSelect($sFolderFullName)->MESSAGES) {
			$this->MessageStoreFlag(new SequenceSet('1:*', false),
				array(MessageFlag::DELETED),
				StoreAction::ADD_FLAGS_SILENT
			);
			$this->FolderExpunge();
		}
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderCreate(string $sFolderName, bool $bSubscribe = false) : void
	{
		$this->SendRequestGetResponse('CREATE', array(
			$this->EscapeFolderName($sFolderName)
//			, ['(USE (\Drafts \Sent))'] RFC 6154
		));
		$bSubscribe && $this->FolderSubscribe($sFolderName);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderDelete(string $sFolderName) : void
	{
		if (!$sFolderName || 'INBOX' === $sFolderName) {
			throw new \InvalidArgumentException;
		}

		$oInfo = $this->hasCapability('IMAP4rev2')
			? $this->FolderExamine($sFolderName)
			: $this->FolderStatus($sFolderName);
		if ($oInfo->MESSAGES) {
			throw new \MailSo\Mail\Exceptions\NonEmptyFolder;
		}

		$this->FolderUnsubscribe($sFolderName);
		$this->FolderUnselect();

		// Uncomment will work issue #124 ?
//		$this->selectOrExamineFolder($sFolderName, true);
		$this->SendRequestGetResponse('DELETE', [$this->EscapeFolderName($sFolderName)]);
//		$this->FolderCheck();

		// Will this workaround solve Dovecot issue #124 ?
		try {
			$this->FolderRename($sFolderName, "{$sFolderName}-dummy");
			$this->FolderRename("{$sFolderName}-dummy", $sFolderName);
		} catch (\Throwable $oException) {
			$this->writeLogException($oException, \LOG_WARNING, false);
		}
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderSubscribe(string $sFolderName) : void
	{
		$this->SendRequestGetResponse('SUBSCRIBE', [$this->EscapeFolderName($sFolderName)]);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderUnsubscribe(string $sFolderName) : void
	{
		$this->SendRequestGetResponse('UNSUBSCRIBE', [$this->EscapeFolderName($sFolderName)]);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderRename(string $sOldFolderName, string $sNewFolderName) : void
	{
		$this->SendRequestGetResponse('RENAME', [
			$this->EscapeFolderName($sOldFolderName),
			$this->EscapeFolderName($sNewFolderName)
		]);
	}

	private function FolderStatusItems() : array
	{
		$aStatusItems = array(
			FolderStatus::MESSAGES,
			FolderStatus::UNSEEN,
			FolderStatus::UIDNEXT,
			FolderStatus::UIDVALIDITY
		);
		// RFC 4551
		if ($this->hasCapability('CONDSTORE')) {
			$aStatusItems[] = FolderStatus::HIGHESTMODSEQ;
		}
		// RFC 7889
		if ($this->hasCapability('APPENDLIMIT')) {
			$aStatusItems[] = FolderStatus::APPENDLIMIT;
		}
		// RFC 8438
		if ($this->hasCapability('STATUS=SIZE')) {
			$aStatusItems[] = FolderStatus::SIZE;
		}
		// RFC 8474
		if ($this->hasCapability('OBJECTID')) {
			$aStatusItems[] = FolderStatus::MAILBOXID;
/*
		} else if ($this->hasCapability('X-DOVECOT')) {
			$aStatusItems[] = 'X-GUID';
*/
		}
		return $aStatusItems;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 *
	 * https://datatracker.ietf.org/doc/html/rfc9051#section-6.3.11
	 */
	public function FolderStatus(string $sFolderName, bool $bSelect = false) : FolderInformation
	{
		$oFolderInfo = $this->oCurrentFolderInfo;
		$bReselect = false;
		$bWritable = false;
		if ($oFolderInfo && $sFolderName === $oFolderInfo->FullName) {
			if ($oFolderInfo->hasStatus) {
				return $oFolderInfo;
			}

			/**
			 * There's a long standing IMAP CLIENTBUG where STATUS command is executed
			 * after SELECT/EXAMINE on same folder (it should not).
			 * So we must unselect the folder to be able to get the APPENDLIMIT and UNSEEN.
			 */
/*
			if ($this->hasCapability('ESEARCH') && !isset($oFolderInfo->UNSEEN)) {
				$oFolderInfo->UNSEEN = $this->MessageSimpleESearch('UNSEEN', ['COUNT'])['COUNT'];
			}
			return $oFolderInfo;
*/
			$bWritable = $oFolderInfo->IsWritable;
			$bReselect = true;
			$this->FolderUnselect();
		}

		$oInfo = new FolderInformation($sFolderName, false);
		$this->SendRequest('STATUS', array($this->EscapeFolderName($sFolderName), $this->FolderStatusItems()));
		foreach ($this->yieldUntaggedResponses() as $oResponse) {
			$oInfo->setStatusFromResponse($oResponse);
		}

		if ($bReselect || $bSelect) {
			// Don't use FolderExamine, else PERMANENTFLAGS is empty in Dovecot
			$oFolderInfo = $this->selectOrExamineFolder($sFolderName, $bSelect || $bWritable, false);
			$oFolderInfo->MESSAGES = \max(0, $oFolderInfo->MESSAGES, $oInfo->MESSAGES);
			// SELECT or EXAMINE command then UNSEEN is the message sequence number of the first unseen message.
			// And deprecated in IMAP4rev2, so we set it to the amount of unseen messages
			$oFolderInfo->UNSEEN = \max(0, $oInfo->UNSEEN);
			$oFolderInfo->UIDNEXT = \max(0, $oFolderInfo->UIDNEXT, $oInfo->UIDNEXT);
			$oFolderInfo->UIDVALIDITY = \max(0, $oFolderInfo->UIDVALIDITY, $oInfo->UIDVALIDITY);
			$oFolderInfo->HIGHESTMODSEQ = \max(0, $oInfo->HIGHESTMODSEQ);
			$oFolderInfo->APPENDLIMIT = \max(0, $oFolderInfo->APPENDLIMIT, $oInfo->APPENDLIMIT);
			$oFolderInfo->MAILBOXID = $oFolderInfo->MAILBOXID ?: $oInfo->MAILBOXID;
//			$oFolderInfo->SIZE = \max($oFolderInfo->SIZE, $oInfo->SIZE);
//			$oFolderInfo->RECENT = \max(0, $oFolderInfo->RECENT, $oInfo->RECENT);
			$oFolderInfo->hasStatus = $oInfo->hasStatus;
			$oFolderInfo->generateETag($this);
			return $oFolderInfo;
		}

		$oInfo->generateETag($this);
		return $oInfo;
	}

	public function FolderStatusAndSelect(string $sFolderName) : FolderInformation
	{
		return $this->FolderStatus($sFolderName, true);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderCheck() : void
	{
		if ($this->IsSelected()) {
			$this->SendRequestGetResponse('CHECK');
		}
	}

	/**
	 * This also expunge the mailbox
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderClose() : int
	{
		if ($this->IsSelected()) {
			$this->SendRequestGetResponse('CLOSE');
			$this->oCurrentFolderInfo = null;
			// https://datatracker.ietf.org/doc/html/rfc5162#section-3.4
			// return HIGHESTMODSEQ ?
		}
		return 0;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderUnselect() : void
	{
		if ($this->IsSelected()) {
			if ($this->hasCapability('UNSELECT')) {
				$this->SendRequestGetResponse('UNSELECT');
			} else {
				try {
					$this->SendRequestGetResponse('SELECT', ['""']);
					// * OK [CLOSED] Previous mailbox closed.
					// 3 NO [CANNOT] Invalid mailbox name: Name is empty
				} catch (\MailSo\Imap\Exceptions\NegativeResponseException $oException) {
				}
			}
		}
		$this->oCurrentFolderInfo = null;
	}

	/**
	 * The EXPUNGE command permanently removes all messages that have the
	 * \Deleted flag set from the currently selected mailbox.
	 *
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderExpunge(SequenceSet $oUidRange = null) : void
	{
		$sCmd = 'EXPUNGE';
		$aArguments = array();

		if ($oUidRange && \count($oUidRange) && $oUidRange->UID && $this->hasCapability('UIDPLUS')) {
			$sCmd = 'UID '.$sCmd;
			$aArguments = array((string) $oUidRange);
		}

		// https://datatracker.ietf.org/doc/html/rfc5162#section-3.5
		// Before returning an OK to the client, those messages that are removed
		// are reported using a VANISHED response or EXPUNGE responses.

		$this->SendRequestGetResponse($sCmd, $aArguments);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderHierarchyDelimiter(string $sFolderName = '') : ?string
	{
		$oResponse = $this->SendRequestGetResponse('LIST', ['""', $this->EscapeFolderName($sFolderName)]);
		return ('LIST' === $oResponse[0]->ResponseList[1]) ? $oResponse[0]->ResponseList[3] : null;
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderSelect(string $sFolderName, bool $bForceReselect = false) : FolderInformation
	{
		return $this->selectOrExamineFolder($sFolderName, true, $bForceReselect);
	}

	/**
	 * The EXAMINE command is identical to SELECT and returns the same output;
	 * however, the selected mailbox is identified as read-only.
	 * No changes to the permanent state of the mailbox, including per-user state,
	 * are permitted; in particular, EXAMINE MUST NOT cause messages to lose the \Recent flag.
	 *
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderExamine(string $sFolderName, bool $bForceReselect = false) : FolderInformation
	{
		return $this->selectOrExamineFolder($sFolderName, $this->Settings->force_select, $bForceReselect);
	}

	/**
	 * @throws \InvalidArgumentException
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 *
	 * REQUIRED IMAP4rev2 untagged responses:  FLAGS, EXISTS, LIST
	 * REQUIRED IMAP4rev2 OK untagged responses:  PERMANENTFLAGS, UIDNEXT, UIDVALIDITY
	 */
	protected function selectOrExamineFolder(string $sFolderName, bool $bIsWritable, bool $bForceReselect) : FolderInformation
	{
		if (!$bForceReselect
		  && $this->oCurrentFolderInfo
		  && $sFolderName === $this->oCurrentFolderInfo->FullName
		  && ($bIsWritable === $this->oCurrentFolderInfo->IsWritable || $this->oCurrentFolderInfo->IsWritable)
		) {
			return $this->oCurrentFolderInfo;
		}

		if (!\strlen(\trim($sFolderName))) {
			throw new \InvalidArgumentException;
		}

		$aSelectParams = array();

/*
		// RFC 5162
		if ($this->hasCapability('QRESYNC')) {
			$this->Enable(['QRESYNC', 'CONDSTORE']);
			- the last known UIDVALIDITY,
			- the last known modification sequence,
			- the optional set of known UIDs,
			- and an optional parenthesized list of known sequence ranges and their corresponding UIDs.
			QRESYNC (UIDVALIDITY HIGHESTMODSEQ 41,43:211,214:541)
			QRESYNC (67890007 20050715194045000 41,43:211,214:541)
		}

		// RFC 4551
		if ($this->hasCapability('CONDSTORE')) {
			$aSelectParams[] = 'CONDSTORE';
		}

		// RFC 5738
		if ($this->UTF8) {
			$aSelectParams[] = 'UTF8';
		}
*/

		$aParams = array(
			$this->EscapeFolderName($sFolderName)
		);
		if ($aSelectParams) {
			$aParams[] = $aSelectParams;
		}

		$oResult = new FolderInformation($sFolderName, $bIsWritable);

		/**
		 * IMAP4rev2 SELECT/EXAMINE are now required to return an untagged LIST response.
		 */
		$this->SendRequest($bIsWritable ? 'SELECT' : 'EXAMINE', $aParams);
		foreach ($this->yieldUntaggedResponses() as $oResponse) {
			if (!$oResult->setStatusFromResponse($oResponse)) {
				// OK untagged responses
				if (\is_array($oResponse->OptionalResponse)) {
					$key = $oResponse->OptionalResponse[0];
					if (\count($oResponse->OptionalResponse) > 1) {
						if ('PERMANENTFLAGS' === $key && \is_array($oResponse->OptionalResponse[1])) {
							$oResult->PermanentFlags = \array_map('\\MailSo\\Base\\Utils::Utf7ModifiedToUtf8', $oResponse->OptionalResponse[1]);
						}
					} else if ('READ-ONLY' === $key) {
						$oResult->IsWritable = false;
					} else if ('READ-WRITE' === $key) {
						$oResult->IsWritable = true;
					} else if ('NOMODSEQ' === $key) {
						// https://datatracker.ietf.org/doc/html/rfc4551#section-3.1.2
					}
				}

				// untagged responses
				else if (\count($oResponse->ResponseList) > 2
				 && 'FLAGS' === $oResponse->ResponseList[1]
				 && \is_array($oResponse->ResponseList[2])) {
					// These could be not permanent, so we don't use them
//					$oResult->Flags = \array_map('\\MailSo\\Base\\Utils::Utf7ModifiedToUtf8', $oResponse->ResponseList[2]);
				}
			}
		}

		// SELECT or EXAMINE command then UNSEEN is the message sequence number of the first unseen message.
		// IMAP4rev2 deprecated
		$oResult->UNSEEN = null;
/*
		if ($this->hasCapability('ESEARCH')) {
			$oResult->UNSEEN = $this->MessageSimpleESearch('UNSEEN', ['COUNT'])['COUNT'];
		}
*/
		$this->oCurrentFolderInfo = $oResult;

		return $oResult;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderList(string $sParentFolderName, string $sListPattern, bool $bIsSubscribeList = false, bool $bUseListStatus = false) : FolderCollection
	{
		$sCmd = 'LIST';

		$aParameters = array();
		$aReturnParams = array();

		if ($this->hasCapability('LIST-EXTENDED')) {
			// RFC 5258
			$aReturnParams[] = 'SUBSCRIBED';
//			$aReturnParams[] = 'CHILDREN';
			if ($bIsSubscribeList) {
				$aParameters[] = ['SUBSCRIBED'/*,'REMOTE','RECURSIVEMATCH'*/];
			} else {
//				$aParameters[0] = '()';
			}
			// RFC 6154
			if ($this->hasCapability('SPECIAL-USE')) {
				$aReturnParams[] = 'SPECIAL-USE';
			}
		} else if ($bIsSubscribeList) {
			// IMAP4rev2 deprecated
			$sCmd = 'LSUB';
		}

		$aParameters[] = $this->EscapeFolderName($sParentFolderName);
		$aParameters[] = $this->EscapeString(\trim($sListPattern));
//		$aParameters[] = $this->EscapeString(\strlen(\trim($sListPattern)) ? $sListPattern : '*');

		// RFC 5819
		if ($bUseListStatus && !$bIsSubscribeList && $this->hasCapability('LIST-STATUS')) {
			$aReturnParams[] = 'STATUS';
			$aReturnParams[] = $this->FolderStatusItems();
		}
/*
		// RFC 5738
		if ($this->UTF8) {
			$aReturnParams[] = 'UTF8'; // 'UTF8ONLY';
		}
*/
		if ($aReturnParams) {
			$aParameters[] = 'RETURN';
			$aParameters[] = $aReturnParams;
		}

/*
		$bPassthru = false;
		if ($bPassthru) {
			$this->SendRequest($sCmd, $aParameters);
			$this->streamResponse();
			return [];
		}
*/

		// RFC 5464
		$bMetadata = !$bIsSubscribeList && $this->hasCapability('METADATA');
		// Dovecot supports fetching all METADATA at once
		$aMetadata = $bMetadata ? $this->getAllMetadata() : null;

		$this->SendRequest($sCmd, $aParameters);
		$aFolders = array();
		$oFolderCollection = new FolderCollection;
		$sDelimiter = '';
		$bInbox = false;
		foreach ($this->yieldUntaggedResponses() as $oResponse) {
			if ('STATUS' === $oResponse->StatusOrIndex && isset($oResponse->ResponseList[2])) {
				$sFullName = $this->toUTF8($oResponse->ResponseList[2]);
				if (!isset($oFolderCollection[$sFullName])) {
					$oFolderCollection[$sFullName] = new Folder($sFullName);
				}
				$oFolderCollection[$sFullName]->setStatusFromResponse($oResponse);
				$oFolderCollection[$sFullName]->generateETag($this);
			}
			else if ($sCmd === $oResponse->StatusOrIndex && 5 <= \count($oResponse->ResponseList)) {
				try
				{
					$sFullName = $this->toUTF8($oResponse->ResponseList[4]);

					/**
					 * $oResponse->ResponseList[0] = *
					 * $oResponse->ResponseList[1] = LIST (all) | LSUB (subscribed)
					 * $oResponse->ResponseList[2] = Attribute flags
					 * $oResponse->ResponseList[3] = Delimiter
					 * $oResponse->ResponseList[4] = FullName
					 */
					if (isset($oFolderCollection[$sFullName])) {
						$oFolder = $oFolderCollection[$sFullName];
						$oFolder->setDelimiter($oResponse->ResponseList[3]);
						$oFolder->setAttributes($oResponse->ResponseList[2]);
					} else {
						$oFolder = new Folder($sFullName, $oResponse->ResponseList[3], $oResponse->ResponseList[2]);
						$oFolderCollection[$sFullName] = $oFolder;
					}

					$bInbox = $bInbox || $oFolder->IsInbox();

					if (!$sDelimiter) {
						$sDelimiter = $oFolder->Delimiter();
					}

					if (isset($aMetadata[$oResponse->ResponseList[4]])) {
						$oFolder->SetAllMetadata($aMetadata[$oResponse->ResponseList[4]]);
					}
				}
				catch (\Throwable $oException)
				{
					$this->writeLogException($oException, \LOG_WARNING, false);
				}
			}
		}

//		$iOptimizationLimit = $this->Settings->folder_list_limit;
//		$oFolderCollection->Optimized = 10 < $iOptimizationLimit && $oFolderCollection->count() > $iOptimizationLimit;

		// RFC 5464
		if ($bMetadata && !$aMetadata /*&& 50 < $oFolderCollection->count()*/) {
			foreach ($oFolderCollection as $oFolder) {
//				if (2 > \substr_count($oFolder->FullName, $oFolder->Delimiter()))
				try {
					$oFolder->SetAllMetadata(
						$this->getMetadata($oFolder->FullName, ['/shared', '/private'], ['DEPTH'=>'infinity'])
					);
				} catch (\Throwable $oException) {
					// Ignore error
				}
			}
		}

		if ($this->hasCapability('ACL') || $this->CapabilityValue('RIGHTS')) {
			foreach ($oFolderCollection as $oFolder) {
				$oFolder->myRights = $this->FolderMyRights($oFolder->FullName);
			}
		}

		if (!$bInbox && !$sParentFolderName && !isset($oFolderCollection['INBOX'])) {
			$oFolderCollection['INBOX'] = new Folder('INBOX', $sDelimiter);
		}

		return $oFolderCollection;
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderSubscribeList(string $sParentFolderName, string $sListPattern) : FolderCollection
	{
		return $this->FolderList($sParentFolderName, $sListPattern, true);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	public function FolderStatusList(string $sParentFolderName, string $sListPattern) : FolderCollection
	{
		return $this->FolderList($sParentFolderName, $sListPattern, false, true);
	}

}
