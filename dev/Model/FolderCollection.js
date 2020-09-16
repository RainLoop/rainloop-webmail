import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { pInt } from 'Common/Utils';
import { ClientSideKeyName, ServerFolderType } from 'Common/Enums';
import * as Cache from 'Common/Cache';

import * as Local from 'Storage/Client';

import AppStore from 'Stores/User/App';
import FolderStore from 'Stores/User/Folder';

import { FolderModel } from 'Model/Folder';

import Remote from 'Remote/User/Fetch';

'use strict';

const Settings = rl.settings,

normalizeFolder = sFolderFullNameRaw => (!sFolderFullNameRaw
	|| UNUSED_OPTION_VALUE === sFolderFullNameRaw
	|| null !== Cache.getFolderFromCacheList(sFolderFullNameRaw))
		? sFolderFullNameRaw
		: '';

class FolderCollectionModel extends Array
{
	constructor() {
		super();
/*
		this.CountRec
		this.Namespace;
		this.IsThreadsSupported
		this.Optimized
		this.SystemFolders
		this.FoldersHash
*/
	}

	/**
	 * @param {?Array} json
	 * @returns {FolderCollectionModel}
	 */
	static reviveFromJson(items) {
		if (!items || 'Collection/FolderCollection' !== items['@Object'] || !Array.isArray(items['@Collection'])) {
			return;
		}

		const result = new FolderCollectionModel,
			expandedFolders = Local.get(ClientSideKeyName.ExpandedFolders),
			bDisplaySpecSetting = FolderStore.displaySpecSetting();

		result.CountRec = items.CountRec;
		result.Namespace = items.Namespace;
		result.IsThreadsSupported = items.IsThreadsSupported;
		result.Optimized = !!items.Optimized;
		result.SystemFolders = items.SystemFolders;
		result.FoldersHash = items.FoldersHash;

		items['@Collection'].forEach(oFolder => {
			if (oFolder) {
				let oCacheFolder = Cache.getFolderFromCacheList(oFolder.FullNameRaw);
				if (!oCacheFolder) {
					oCacheFolder = FolderModel.newInstanceFromJson(oFolder);
					if (oCacheFolder) {
						Cache.setFolderToCacheList(oFolder.FullNameRaw, oCacheFolder);
						Cache.setFolderFullNameRaw(oCacheFolder.fullNameHash, oFolder.FullNameRaw, oCacheFolder);
					}
				}

				if (oCacheFolder) {
					if (bDisplaySpecSetting) {
						oCacheFolder.checkable(!!oFolder.Checkable);
					} else {
						oCacheFolder.checkable(true);
					}

					oCacheFolder.collapsed(!expandedFolders
						|| !Array.isArray(expandedFolders)
						|| !expandedFolders.includes(oCacheFolder.fullNameHash));

					if (oFolder.Extended) {
						if (oFolder.Extended.Hash) {
							Cache.setFolderHash(oCacheFolder.fullNameRaw, oFolder.Extended.Hash);
						}

						if (null != oFolder.Extended.MessageCount) {
							oCacheFolder.messageCountAll(oFolder.Extended.MessageCount);
						}

						if (null != oFolder.Extended.MessageUnseenCount) {
							oCacheFolder.messageCountUnread(oFolder.Extended.MessageUnseenCount);
						}
					}

					if (oFolder.SubFolders) {
						oFolder.SubFolders = FolderCollectionModel.reviveFromJson(oFolder.SubFolders);
						oCacheFolder.subFolders(oFolder.SubFolders);
					}

					result.push(oCacheFolder);
				}
			}
		});

		return result;
	}

	storeIt() {
		const cnt = pInt(this.CountRec);

		let limit = pInt(Settings.app('folderSpecLimit'));
		limit = 100 < limit ? 100 : 10 > limit ? 10 : limit;

		FolderStore.displaySpecSetting(0 >= cnt || limit < cnt);

		FolderStore.folderList(this);

		if (undefined !== this.Namespace) {
			FolderStore.namespace = this.Namespace;
		}

		AppStore.threadsAllowed(!!(Settings.app('useImapThread') && this.IsThreadsSupported));

		FolderStore.folderList.optimized(this.Optimized);

		let update = false;

		if (
			this.SystemFolders &&
				!('' +
					Settings.get('SentFolder') +
					Settings.get('DraftFolder') +
					Settings.get('SpamFolder') +
					Settings.get('TrashFolder') +
					Settings.get('ArchiveFolder') +
					Settings.get('NullFolder'))
		) {
			Settings.set('SentFolder', this.SystemFolders[ServerFolderType.SENT] || null);
			Settings.set('DraftFolder', this.SystemFolders[ServerFolderType.DRAFTS] || null);
			Settings.set('SpamFolder', this.SystemFolders[ServerFolderType.JUNK] || null);
			Settings.set('TrashFolder', this.SystemFolders[ServerFolderType.TRASH] || null);
			Settings.set('ArchiveFolder', this.SystemFolders[ServerFolderType.ALL] || null);

			update = true;
		}

		FolderStore.sentFolder(normalizeFolder(Settings.get('SentFolder')));
		FolderStore.draftFolder(normalizeFolder(Settings.get('DraftFolder')));
		FolderStore.spamFolder(normalizeFolder(Settings.get('SpamFolder')));
		FolderStore.trashFolder(normalizeFolder(Settings.get('TrashFolder')));
		FolderStore.archiveFolder(normalizeFolder(Settings.get('ArchiveFolder')));

		if (update) {
			Remote.saveSystemFolders(()=>{}, {
				SentFolder: FolderStore.sentFolder(),
				DraftFolder: FolderStore.draftFolder(),
				SpamFolder: FolderStore.spamFolder(),
				TrashFolder: FolderStore.trashFolder(),
				ArchiveFolder: FolderStore.archiveFolder(),
				NullFolder: 'NullFolder'
			});
		}

		Local.set(ClientSideKeyName.FoldersLashHash, this.FoldersHash);
	}

}

export { FolderCollectionModel, FolderCollectionModel as default };
