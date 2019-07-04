import _ from '_';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { isArray, isNormal, pInt, isUnd, noop } from 'Common/Utils';
import { ClientSideKeyName, ServerFolderType } from 'Common/Enums';
import * as Cache from 'Common/Cache';

import * as Settings from 'Storage/Settings';
import * as Local from 'Storage/Client';

import AppStore from 'Stores/User/App';
import FolderStore from 'Stores/User/Folder';

import Remote from 'Remote/User/Ajax';

import { FolderModel } from 'Model/Folder';
import { AbstractBasicPromises } from 'Promises/AbstractBasic';

class PromisesUserPopulator extends AbstractBasicPromises {
	/**
	 * @param {string} sFullNameHash
	 * @param {Array?} expandedFolders
	 * @returns {boolean}
	 */
	isFolderExpanded(sFullNameHash, expandedFolders) {
		return expandedFolders && isArray(expandedFolders) && -1 !== _.indexOf(expandedFolders, sFullNameHash);
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @returns {string}
	 */
	normalizeFolder(sFolderFullNameRaw) {
		return '' === sFolderFullNameRaw ||
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

		_.each(aFolders, (oFolder) => {
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

						if (isNormal(oFolder.Extended.MessageCount)) {
							oCacheFolder.messageCountAll(oFolder.Extended.MessageCount);
						}

						if (isNormal(oFolder.Extended.MessageUnseenCount)) {
							oCacheFolder.messageCountUnread(oFolder.Extended.MessageUnseenCount);
						}
					}

					if (
						oFolder.SubFolders &&
						'Collection/FolderCollection' === oFolder.SubFolders['@Object'] &&
						oFolder.SubFolders['@Collection'] &&
						isArray(oFolder.SubFolders['@Collection'])
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
			isArray(oData['@Collection'])
		) {
			const expandedFolders = Local.get(ClientSideKeyName.ExpandedFolders),
				cnt = pInt(oData.CountRec);

			let limit = pInt(Settings.appSettingsGet('folderSpecLimit'));
			limit = 100 < limit ? 100 : 10 > limit ? 10 : limit;

			FolderStore.displaySpecSetting(0 >= cnt || limit < cnt);

			FolderStore.folderList(
				this.folderResponseParseRec(
					isUnd(oData.Namespace) ? '' : oData.Namespace,
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
			isArray(oData['@Collection'])
		) {
			if (!isUnd(oData.Namespace)) {
				FolderStore.namespace = oData.Namespace;
			}

			AppStore.threadsAllowed(!!Settings.appSettingsGet('useImapThread') && oData.IsThreadsSupported && true);

			FolderStore.folderList.optimized(!!oData.Optimized);

			let update = false;

			if (
				oData.SystemFolders &&
				'' ===
					'' +
						Settings.settingsGet('SentFolder') +
						Settings.settingsGet('DraftFolder') +
						Settings.settingsGet('SpamFolder') +
						Settings.settingsGet('TrashFolder') +
						Settings.settingsGet('ArchiveFolder') +
						Settings.settingsGet('NullFolder')
			) {
				Settings.settingsSet('SentFolder', oData.SystemFolders[ServerFolderType.SENT] || null);
				Settings.settingsSet('DraftFolder', oData.SystemFolders[ServerFolderType.DRAFTS] || null);
				Settings.settingsSet('SpamFolder', oData.SystemFolders[ServerFolderType.JUNK] || null);
				Settings.settingsSet('TrashFolder', oData.SystemFolders[ServerFolderType.TRASH] || null);
				Settings.settingsSet('ArchiveFolder', oData.SystemFolders[ServerFolderType.ALL] || null);

				update = true;
			}

			FolderStore.sentFolder(this.normalizeFolder(Settings.settingsGet('SentFolder')));
			FolderStore.draftFolder(this.normalizeFolder(Settings.settingsGet('DraftFolder')));
			FolderStore.spamFolder(this.normalizeFolder(Settings.settingsGet('SpamFolder')));
			FolderStore.trashFolder(this.normalizeFolder(Settings.settingsGet('TrashFolder')));
			FolderStore.archiveFolder(this.normalizeFolder(Settings.settingsGet('ArchiveFolder')));

			if (update) {
				Remote.saveSystemFolders(noop, {
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
