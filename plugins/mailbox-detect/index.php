<?php

use MailSo\Imap\Enumerations\FolderType;
use MailSo\Imap\Enumerations\MetadataKeys;

class MailboxDetectPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'MailboxDetect',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '2.2',
		RELEASE  = '2023-01-23',
		REQUIRED = '2.25.0',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Autodetect system folders and/or create them when needed';

	public function Init() : void
	{
		$this->addHook('json.after-folders', 'AfterFolders');
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('autocreate_system_folders')->SetLabel('Autocreate system folders')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false),
		);
	}

	public function AfterFolders(array &$aResponse)
	{
		if (!empty($aResponse['Result']['@Collection'])) {
			$oActions = \RainLoop\Api::Actions();
			$oAccount = $oActions->getAccountFromToken();
			if (!$oAccount) {
				\error_log('No Account');
				return;
			}
			$oSettingsLocal = $oActions->SettingsProvider(true)->Load($oAccount);
			$roles = [
				'inbox'   => false,
				'sent'    => !!$oSettingsLocal->GetConf('SentFolder', ''),
				'drafts'  => !!$oSettingsLocal->GetConf('DraftFolder', ''),
				'junk'    => !!$oSettingsLocal->GetConf('SpamFolder', ''),
				'trash'   => !!$oSettingsLocal->GetConf('TrashFolder', ''),
				'archive' => !!$oSettingsLocal->GetConf('ArchiveFolder', '')
			];
			$types = [
				FolderType::SENT => 'sent',
				FolderType::DRAFTS => 'drafts',
				FolderType::JUNK => 'junk',
				FolderType::TRASH => 'trash',
				FolderType::ARCHIVE => 'archive'
			];
			$found = [
				'inbox'   => [],
				'sent'    => [],
				'drafts'  => [],
				'junk'    => [],
				'trash'   => [],
				'archive' => []
			];
			$aMap = $this->systemFoldersNames($oAccount);
			$sDelimiter = '';
			foreach ($aResponse['Result']['@Collection'] as $i => $folder) {
				$sDelimiter || ($sDelimiter = $folder['delimiter']);
				if ($folder['role']) {
					$roles[$folder['role']] = true;
				} else if (\in_array('\\sentmail', $folder['flags'])) {
					$found['sent'][] = $i;
				} else if (\in_array('\\spam', $folder['flags'])) {
					$found['junk'][] = $i;
				} else if (\in_array('\\bin', $folder['flags'])) {
					$found['trash'][] = $i;
				} else if (\in_array('\\starred', $folder['flags'])) {
					$found['flagged'][] = $i;
				} else {
					// Kolab
					$kolab = $folder['metadata'][MetadataKeys::KOLAB_CTYPE]
						?? $folder['metadata'][MetadataKeys::KOLAB_CTYPE_SHARED]
						?? '';
					if ('mail.inbox' === $kolab) {
						$found['inbox'][] = $i;
					} else if ('mail.sentitems' === $kolab /*|| 'mail.outbox' === $kolab*/) {
						$found['sent'][] = $i;
					} else if ('mail.drafts' === $kolab) {
						$found['drafts'][] = $i;
					} else if ('mail.junkemail' === $kolab) {
						$found['junk'][] = $i;
					} else if ('mail.wastebasket' === $kolab) {
						$found['trash'][] = $i;
					} else {
						$iFolderType = 0;
						if (isset($aMap[$folder['fullName']])) {
							$iFolderType = $aMap[$folder['fullName']];
						} else if (isset($aMap[$folder['name']]) || isset($aMap["INBOX{$folder['delimiter']}{$folder['name']}"])) {
							$iFolderType = $aMap[$folder['name']];
						}
						if ($iFolderType && isset($types[$iFolderType])) {
							$found[$types[$iFolderType]][] = $i;
						}
					}
				}
			}
			foreach ($roles as $role => $hasRole) {
				if ($hasRole) {
					unset($found[$role]);
				}
			}
			if ($found) {
				foreach ($found as $role => $folders) {
					if (isset($folders[0])) {
						// Set the first as default
//						\error_log("Set role {$role}");
						$aResponse['Result']['@Collection'][$folders[0]]['role'] = $role;
					} else if ($this->Config()->Get('plugin', 'autocreate_system_folders', false)) {
						try
						{
							$sParent = \substr($aResponse['Result']['namespace'], 0, -1);
							$sFolderNameToCreate = \ucfirst($role);
/*
							$this->Manager()->RunHook('filter.folders-system-types', array($oAccount, &$aList));
							$iPos = \strrpos($sFolderNameToCreate, $sDelimiter);
							if (false !== $iPos) {
								$mNewParent = \substr($sFolderNameToCreate, 0, $iPos);
								$mNewFolderNameToCreate = \substr($sFolderNameToCreate, $iPos + 1);
								if (\strlen($mNewFolderNameToCreate)) {
									$sFolderNameToCreate = $mNewFolderNameToCreate;
								}

								if (\strlen($mNewParent)) {
									$sParent = \strlen($sParent) ? $sParent.$sDelimiter.$mNewParent : $mNewParent;
								}
							}
*/
//							\error_log("Create mailbox {$sFolderNameToCreate}");
							$oFolder = $oActions->MailClient()->FolderCreate(
								$sFolderNameToCreate,
								$sParent,
								true,
								$sDelimiter
							);
							$aResponse['Result']['@Collection'][] = \json_encode($oFolder);
						}
						catch (\Throwable $oException)
						{
							$this->Logger()->WriteException($oException);
						}
					}
				}
			}
		}
	}

	/**
	 * @staticvar array $aCache
	 */
	private function systemFoldersNames(\RainLoop\Model\Account $oAccount) : array
	{
		static $aCache = null;
		if (null === $aCache) {
			$aCache = array(
				'Sent' => FolderType::SENT,
				'Send' => FolderType::SENT,
				'Outbox' => FolderType::SENT,
				'Out box' => FolderType::SENT,
				'Sent Item' => FolderType::SENT,
				'Sent Items' => FolderType::SENT,
				'Send Item' => FolderType::SENT,
				'Send Items' => FolderType::SENT,
				'Sent Mail' => FolderType::SENT,
				'Sent Mails' => FolderType::SENT,
				'Send Mail' => FolderType::SENT,
				'Send Mails' => FolderType::SENT,

				'Drafts' => FolderType::DRAFTS,
				'Draft' => FolderType::DRAFTS,
				'Draft Mail' => FolderType::DRAFTS,
				'Draft Mails' => FolderType::DRAFTS,
				'Drafts Mail' => FolderType::DRAFTS,
				'Drafts Mails' => FolderType::DRAFTS,

				'Junk' => FolderType::JUNK,
				'Junk E-mail' => FolderType::JUNK,
				'Spam' => FolderType::JUNK,
				'Spams' => FolderType::JUNK,
				'Bulk Mail' => FolderType::JUNK,
				'Bulk Mails' => FolderType::JUNK,

				'Trash' => FolderType::TRASH,
				'Deleted' => FolderType::TRASH,
				'Deleted Items' => FolderType::TRASH,
				'Bin' => FolderType::TRASH,

				'Archive' => FolderType::ARCHIVE,
				'Archives' => FolderType::ARCHIVE,

				'All' => FolderType::ALL,
				'All Mail' => FolderType::ALL,
				'All Mails' => FolderType::ALL,
			);

			$aNewCache = array();
			foreach ($aCache as $sKey => $iType) {
				$aNewCache[$sKey] = $iType;
				$aNewCache[\str_replace(' ', '', $sKey)] = $iType;
			}

			$aCache = $aNewCache;

			$this->Manager()->RunHook('filter.system-folders-names', array($oAccount, &$aCache));
		}

		return $aCache;
	}
}
