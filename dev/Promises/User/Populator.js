import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { pInt } from 'Common/Utils';
import { ClientSideKeyName, ServerFolderType } from 'Common/Enums';
import * as Cache from 'Common/Cache';

import * as Local from 'Storage/Client';

import AppStore from 'Stores/User/App';
import FolderStore from 'Stores/User/Folder';

import Remote from 'Remote/User/Fetch';

import { FolderModel } from 'Model/Folder';

const Settings = rl.settings;

class PromisesUserPopulator {

	/**
	 * @param {string} sFullNameHash
	 * @param {Array?} expandedFolders
	 * @returns {boolean}
	 */
	isFolderExpanded(sFullNameHash, expandedFolders) {
		return expandedFolders && Array.isArray(expandedFolders) && expandedFolders.includes(sFullNameHash);
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @returns {string}
	 */
	normalizeFolder(sFolderFullNameRaw) {
		return !sFolderFullNameRaw ||
			UNUSED_OPTION_VALUE === sFolderFullNameRaw ||
			null !== Cache.getFolderFromCacheList(sFolderFullNameRaw)
			? sFolderFullNameRaw
			: '';
	}

	/**
	 * @param {string} sNamespace
	 * @param {Array} aFolders
	 * @param {Array?} expandedFolders
	 * @returns {Array}
	 */
	folderResponseParseRec(sNamespace, aFolders, expandedFolders) {
		const bDisplaySpecSetting = FolderStore.displaySpecSetting(),
			aList = [];

		aFolders.forEach(oFolder => {
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

					oCacheFolder.collapsed(!this.isFolderExpanded(oCacheFolder.fullNameHash, expandedFolders));

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

					if (
						oFolder.SubFolders &&
						'Collection/FolderCollection' === oFolder.SubFolders['@Object'] &&
						oFolder.SubFolders['@Collection'] &&
						Array.isArray(oFolder.SubFolders['@Collection'])
					) {
						oCacheFolder.subFolders(
							this.folderResponseParseRec(sNamespace, oFolder.SubFolders['@Collection'], expandedFolders)
						);
					}

					aList.push(oCacheFolder);
				}
			}
		});

		return aList;
	}

	foldersList(oData) {
		if (
			oData &&
			'Collection/FolderCollection' === oData['@Object'] &&
			oData['@Collection'] &&
			Array.isArray(oData['@Collection'])
		) {
			const expandedFolders = Local.get(ClientSideKeyName.ExpandedFolders),
				cnt = pInt(oData.CountRec);

			let limit = pInt(Settings.app('folderSpecLimit'));
			limit = 100 < limit ? 100 : 10 > limit ? 10 : limit;

			FolderStore.displaySpecSetting(0 >= cnt || limit < cnt);

			FolderStore.folderList(
				this.folderResponseParseRec(
					undefined === oData.Namespace ? '' : oData.Namespace,
					oData['@Collection'],
					expandedFolders
				)
			); // @todo optimization required
		}
	}

	foldersAdditionalParameters(oData) {
		if (
			oData &&
			oData &&
			'Collection/FolderCollection' === oData['@Object'] &&
			oData['@Collection'] &&
			Array.isArray(oData['@Collection'])
		) {
			if (undefined !== oData.Namespace) {
				FolderStore.namespace = oData.Namespace;
			}

			AppStore.threadsAllowed(!!Settings.app('useImapThread') && oData.IsThreadsSupported && true);

			FolderStore.folderList.optimized(!!oData.Optimized);

			let update = false;

			if (
				oData.SystemFolders &&
					!('' +
						Settings.get('SentFolder') +
						Settings.get('DraftFolder') +
						Settings.get('SpamFolder') +
						Settings.get('TrashFolder') +
						Settings.get('ArchiveFolder') +
						Settings.get('NullFolder'))
			) {
				Settings.set('SentFolder', oData.SystemFolders[ServerFolderType.SENT] || null);
				Settings.set('DraftFolder', oData.SystemFolders[ServerFolderType.DRAFTS] || null);
				Settings.set('SpamFolder', oData.SystemFolders[ServerFolderType.JUNK] || null);
				Settings.set('TrashFolder', oData.SystemFolders[ServerFolderType.TRASH] || null);
				Settings.set('ArchiveFolder', oData.SystemFolders[ServerFolderType.ALL] || null);

				update = true;
			}

			FolderStore.sentFolder(this.normalizeFolder(Settings.get('SentFolder')));
			FolderStore.draftFolder(this.normalizeFolder(Settings.get('DraftFolder')));
			FolderStore.spamFolder(this.normalizeFolder(Settings.get('SpamFolder')));
			FolderStore.trashFolder(this.normalizeFolder(Settings.get('TrashFolder')));
			FolderStore.archiveFolder(this.normalizeFolder(Settings.get('ArchiveFolder')));

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

			Local.set(ClientSideKeyName.FoldersLashHash, oData.FoldersHash);
		}
	}
}

export default new PromisesUserPopulator();
