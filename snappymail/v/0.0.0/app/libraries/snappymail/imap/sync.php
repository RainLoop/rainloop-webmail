<?php

namespace SnappyMail\Imap;

use MailSo\Imap\Enumerations\FetchType;
use MailSo\Imap\Enumerations\MessageFlag;
use MailSo\Imap\FetchResponse;
use MailSo\Mime\Enumerations\Header;

class Sync
{
	public
		$oImapSource,
		$oImapTarget;

	function import(string $sTargetRootFolderName = '')
	{
		$sParent = '';
		$sListPattern = '*';

		$this->oImapSource->TAG_PREFIX = 'S';
		$this->oImapTarget->TAG_PREFIX = 'T';

//		$this->oImapTarget->Logger()->Write('Get oImapTarget->FolderList');
		\SnappyMail\Log::notice('SYNC', 'Get oImapTarget->FolderList');
		$aTargetFolders = $this->oImapTarget->FolderList($sParent, $sListPattern);
		if (!$aTargetFolders) {
			return null;
		}
		$sTargetINBOX = 'INBOX';
		$sTargetDelimiter = '';
		foreach ($aTargetFolders as $sFullName => $oImapFolder) {
			if ($oImapFolder->IsInbox()) {
				$sTargetINBOX = $sFullName;
			}
			if (!$sTargetDelimiter) {
				$sTargetDelimiter = $oImapFolder->Delimiter();
			}
		}

		\SnappyMail\Log::notice('SYNC', 'Get oImapSource->FolderList');
		$bUseListStatus = $this->oImapSource->IsSupported('LIST-EXTENDED');
		$aSourceFolders = $this->oImapSource->FolderList($sParent, $sListPattern, false, $bUseListStatus);
		if (!$aSourceFolders) {
			return null;
		}
		$sSourceINBOX = 'INBOX';

		\SnappyMail\HTTP\Stream::start();
		\SnappyMail\HTTP\Stream::JSON([
			'folders' => \count($aSourceFolders)
		]);

		$fi = 0;
		\ignore_user_abort(true);
		foreach ($aSourceFolders as $sSourceFolderName => $oImapFolder) {
			++$fi;
			\SnappyMail\HTTP\Stream::JSON([
				'index' => $fi,
				'folder' => $sSourceFolderName
			]);
			if ($oImapFolder->IsSelectable()) {
				if ($oImapFolder->IsInbox()) {
					$sSourceINBOX = $sSourceFolderName;
				}
				// Set mailbox delimiter
				$sTargetFolderName = $sSourceFolderName;
				if ($sTargetDelimiter) {
					$sTargetFolderName = \str_replace($oImapFolder->Delimiter(), $sTargetDelimiter, $sTargetFolderName);
					$sTargetRootFolderName = \str_replace($sTargetDelimiter, '-', $sTargetRootFolderName);
				}
				if ($sTargetRootFolderName) {
					$sTargetFolderName = $sTargetRootFolderName . ($sTargetDelimiter?:'-') . $sTargetFolderName;
				}
				// Create mailbox if not exists
				if (!isset($aTargetFolders[$sTargetFolderName])) {
					$this->oImapTarget->FolderCreate($sTargetFolderName);
					if (!$bUseListStatus || \in_array('\\subscribed', $oImapFolder->FlagsLowerCase())) {
						$this->oImapTarget->FolderSubscribe($sTargetFolderName);
					}
				} else if (!$aTargetFolders[$sTargetFolderName]->IsSelectable()) {
					// Can't copy messages
					continue;
				}

				// Set Source metadata on target
				if ($aMetadata = $oImapFolder->Metadata()) {
					$this->oImapTarget->FolderSetMetadata($sTargetFolderName, $aMetadata);
				}

				$oSourceInfo = $this->oImapSource->FolderSelect($sSourceFolderName);
				if ($oSourceInfo->MESSAGES) {
					\SnappyMail\HTTP\Stream::JSON([
						'index' => $fi,
						'messages' => $oSourceInfo->MESSAGES
					]);
					// All id's to skip from source
					$oTargetInfo = $this->oImapTarget->FolderSelect($sTargetFolderName);
					if ($oTargetInfo->MESSAGES) {
						// Get all existing message id's from target to skip
						$aTargetMessageIDs = [];
						$this->oImapTarget->SendRequest('FETCH', [
							'1:*', [FetchType::BuildBodyCustomHeaderRequest([Header::MESSAGE_ID], true)]
						]);
						foreach ($this->oImapTarget->yieldUntaggedResponses() as $oResponse) {
							if ('FETCH' === $oResponse->ResponseList[2]) {
								// $oResponse->ResponseList[3][0] == 'BODY[HEADER.FIELDS (MESSAGE-ID)]'
								// 'Message-ID: ...'
								$aTargetMessageIDs[] = $oResponse->ResponseList[3][1];
							}
						}
					}
					// Set all existing id's from source to skip and get all flags
					$aSourceSkipIDs = [];
					$aSourceFlags = [];
					$this->oImapSource->SendRequest('FETCH', [
						'1:*', [FetchType::FLAGS, FetchType::BuildBodyCustomHeaderRequest([Header::MESSAGE_ID], true)]
					]);
					foreach ($this->oImapSource->yieldUntaggedResponses() as $oResponse) {
						if ('FETCH' === $oResponse->ResponseList[2]
						 && isset($oResponse->ResponseList[3])
						 && \is_array($oResponse->ResponseList[3])
						) {
							$id = $oResponse->ResponseList[1];
							foreach ($oResponse->ResponseList[3] as $i => $mItem) {
								if ('FLAGS' === $mItem) {
									$aSourceFlags[$id] = $oResponse->ResponseList[3][$i+1];
								} else if ('MESSAGE-ID' === $mItem && \in_array($oResponse->ResponseList[3][$i+1], $aTargetMessageIDs)) {
									$aSourceSkipIDs[] = $id;
								}
							}
						}
					}

					$aTargetMessageIDs = [];
					// Now copy each message from source to target
					for ($i = 1; $i <= $oSourceInfo->MESSAGES; ++$i) {
						if (!\in_array($i, $aSourceSkipIDs)) {
							$sPeek = $this->oImapSource->IsSupported('BINARY')
								? FetchType::BINARY_PEEK
								: FetchType::BODY_PEEK;
							$iAppendUid = 0;
							$aFetchResponse = $this->oImapSource->Fetch(array(
								array(
									$sPeek.'[]',
									function ($sParent, $sLiteralAtomUpperCase, $rLiteralStream, $iLiteralLen)
									use ($sTargetFolderName, &$iAppendUid, $aSourceFlags, $i) {
										if (\strlen($sLiteralAtomUpperCase) && \is_resource($rLiteralStream) && 'FETCH' === $sParent) {
//											$sMessage = \stream_get_contents($rLiteralStream);
											$iAppendUid = $this->oImapTarget->MessageAppendStream(
												$sTargetFolderName,
												$rLiteralStream,
												$iLiteralLen,
												isset($aSourceFlags[$i]) ? $aSourceFlags[$i] : []
											);
										}
									}
								)), $i, false);

/*
							$aFlags = $aFetchResponse[0]->GetFetchValue('FLAGS');
							$iAppendUid = $this->oImapTarget->MessageAppendStream(
								$sTargetFolderName,
								$rLiteralStream,
								$iLiteralLen,
								$aFlags
							);
							if ($iAppendUid && $aFlags) {
								$this->MessageStoreFlag(
									new SequenceSet([$iAppendUid]),
									$aFlags,
									\MailSo\Imap\Enumerations\StoreAction::ADD_FLAGS_SILENT
								);
							}
*/
						}

						\SnappyMail\HTTP\Stream::JSON([
							'index' => $fi,
							'message' => $i
						]);
					}
				}
			}
		}
	}

}
