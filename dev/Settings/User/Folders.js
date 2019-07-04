import ko from 'ko';

import { ClientSideKeyName, Notification, Magics } from 'Common/Enums';
import { trim, noop } from 'Common/Utils';
import { getNotification, i18n } from 'Common/Translator';

import { removeFolderFromCacheList } from 'Common/Cache';

import { appSettingsGet } from 'Storage/Settings';
import * as Local from 'Storage/Client';

import FolderStore from 'Stores/User/Folder';

import Promises from 'Promises/User/Ajax';
import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { showScreenPopup } from 'Knoin/Knoin';

class FoldersUserSettings {
	constructor() {
		this.displaySpecSetting = FolderStore.displaySpecSetting;
		this.folderList = FolderStore.folderList;

		this.folderListHelp = ko.observable('').extend({ throttle: Magics.Time100ms });

		this.loading = ko.computed(() => {
			const loading = FolderStore.foldersLoading(),
				creating = FolderStore.foldersCreating(),
				deleting = FolderStore.foldersDeleting(),
				renaming = FolderStore.foldersRenaming();

			return loading || creating || deleting || renaming;
		});

		this.folderForDeletion = ko.observable(null).deleteAccessHelper();

		this.folderForEdit = ko.observable(null).extend({ toggleSubscribeProperty: [this, 'edited'] });

		this.useImapSubscribe = !!appSettingsGet('useImapSubscribe');
	}

	folderEditOnEnter(folder) {
		const nameToEdit = folder ? trim(folder.nameForEdit()) : '';

		if ('' !== nameToEdit && folder.name() !== nameToEdit) {
			Local.set(ClientSideKeyName.FoldersLashHash, '');

			getApp().foldersPromisesActionHelper(
				Promises.folderRename(folder.fullNameRaw, nameToEdit, FolderStore.foldersRenaming),
				Notification.CantRenameFolder
			);

			removeFolderFromCacheList(folder.fullNameRaw);

			folder.name(nameToEdit);
		}

		folder.edited(false);
	}

	folderEditOnEsc(folder) {
		if (folder) {
			folder.edited(false);
		}
	}

	onShow() {
		FolderStore.folderList.error('');
	}

	onBuild(oDom) {
		oDom
			.on('mouseover', '.delete-folder-parent', () => {
				this.folderListHelp(i18n('SETTINGS_FOLDERS/HELP_DELETE_FOLDER'));
			})
			.on('mouseover', '.subscribe-folder-parent', () => {
				this.folderListHelp(i18n('SETTINGS_FOLDERS/HELP_SHOW_HIDE_FOLDER'));
			})
			.on('mouseover', '.check-folder-parent', () => {
				this.folderListHelp(i18n('SETTINGS_FOLDERS/HELP_CHECK_FOR_NEW_MESSAGES'));
			})
			.on('mouseout', '.subscribe-folder-parent, .check-folder-parent, .delete-folder-parent', () => {
				this.folderListHelp('');
			});
	}

	createFolder() {
		showScreenPopup(require('View/Popup/FolderCreate'));
	}

	systemFolder() {
		showScreenPopup(require('View/Popup/FolderSystem'));
	}

	deleteFolder(folderToRemove) {
		if (
			folderToRemove &&
			folderToRemove.canBeDeleted() &&
			folderToRemove.deleteAccess() &&
			0 === folderToRemove.privateMessageCountAll()
		) {
			this.folderForDeletion(null);

			if (folderToRemove) {
				const fRemoveFolder = function(folder) {
					if (folderToRemove === folder) {
						return true;
					}
					folder.subFolders.remove(fRemoveFolder);
					return false;
				};

				Local.set(ClientSideKeyName.FoldersLashHash, '');

				FolderStore.folderList.remove(fRemoveFolder);

				getApp().foldersPromisesActionHelper(
					Promises.folderDelete(folderToRemove.fullNameRaw, FolderStore.foldersDeleting),
					Notification.CantDeleteFolder
				);

				removeFolderFromCacheList(folderToRemove.fullNameRaw);
			}
		} else if (0 < folderToRemove.privateMessageCountAll()) {
			FolderStore.folderList.error(getNotification(Notification.CantDeleteNonEmptyFolder));
		}
	}

	subscribeFolder(folder) {
		Local.set(ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(noop, folder.fullNameRaw, true);
		folder.subScribed(true);
	}

	unSubscribeFolder(folder) {
		Local.set(ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(noop, folder.fullNameRaw, false);
		folder.subScribed(false);
	}

	checkableTrueFolder(folder) {
		Remote.folderSetCheckable(noop, folder.fullNameRaw, true);
		folder.checkable(true);
	}

	checkableFalseFolder(folder) {
		Remote.folderSetCheckable(noop, folder.fullNameRaw, false);
		folder.checkable(false);
	}
}

export { FoldersUserSettings, FoldersUserSettings as default };
