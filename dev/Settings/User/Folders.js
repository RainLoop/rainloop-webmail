import ko from 'ko';

import { Notification } from 'Common/Enums';
import { ClientSideKeyName } from 'Common/EnumsUser';
import { getNotification, i18n } from 'Common/Translator';

import { removeFolderFromCacheList } from 'Common/Cache';

import * as Local from 'Storage/Client';

import FolderStore from 'Stores/User/Folder';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { FolderCreatePopupView } from 'View/Popup/FolderCreate';
import { FolderSystemPopupView } from 'View/Popup/FolderSystem';

export class FoldersUserSettings {
	constructor() {
		this.displaySpecSetting = FolderStore.displaySpecSetting;
		this.folderList = FolderStore.folderList;
		this.folderListOptimized = FolderStore.folderListOptimized;
		this.folderListError = FolderStore.folderListError;

		this.folderListHelp = ko.observable('').extend({ throttle: 100 });

		this.loading = ko.computed(() => {
			const loading = FolderStore.foldersLoading(),
				creating = FolderStore.foldersCreating(),
				deleting = FolderStore.foldersDeleting(),
				renaming = FolderStore.foldersRenaming();

			return loading || creating || deleting || renaming;
		});

		this.folderForDeletion = ko.observable(null).deleteAccessHelper();

		this.folderForEdit = ko.observable(null).extend({ toggleSubscribeProperty: [this, 'edited'] });

		this.useImapSubscribe = !!rl.settings.app('useImapSubscribe');
	}

	folderEditOnEnter(folder) {
		const nameToEdit = folder ? folder.nameForEdit().trim() : '';

		if (nameToEdit && folder.name() !== nameToEdit) {
			Local.set(ClientSideKeyName.FoldersLashHash, '');

			rl.app.foldersPromisesActionHelper(
				Remote.folderRename(folder.fullNameRaw, nameToEdit, FolderStore.foldersRenaming),
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
		FolderStore.folderListError('');
	}

	onBuild(oDom) {
		oDom.addEventListener('mouseover', event => {
			const eqs = s => event.target.closestWithin(s, oDom);
			eqs('.delete-folder-parent') && this.folderListHelp(i18n('SETTINGS_FOLDERS/HELP_DELETE_FOLDER'));
			eqs('.subscribe-folder-parent') && this.folderListHelp(i18n('SETTINGS_FOLDERS/HELP_SHOW_HIDE_FOLDER'));
			eqs('.check-folder-parent') && this.folderListHelp(i18n('SETTINGS_FOLDERS/HELP_CHECK_FOR_NEW_MESSAGES'));
		});
		oDom.addEventListener('mouseout', () => this.folderListHelp(''));
	}

	createFolder() {
		showScreenPopup(FolderCreatePopupView);
	}

	systemFolder() {
		showScreenPopup(FolderSystemPopupView);
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

				rl.app.foldersPromisesActionHelper(
					Remote.folderDelete(folderToRemove.fullNameRaw, FolderStore.foldersDeleting),
					Notification.CantDeleteFolder
				);

				removeFolderFromCacheList(folderToRemove.fullNameRaw);
			}
		} else if (0 < folderToRemove.privateMessageCountAll()) {
			FolderStore.folderListError(getNotification(Notification.CantDeleteNonEmptyFolder));
		}
	}

	subscribeFolder(folder) {
		Local.set(ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(()=>{}, folder.fullNameRaw, true);
		folder.subscribed(true);
	}

	unSubscribeFolder(folder) {
		Local.set(ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(()=>{}, folder.fullNameRaw, false);
		folder.subscribed(false);
	}

	checkableTrueFolder(folder) {
		Remote.folderSetCheckable(()=>{}, folder.fullNameRaw, true);
		folder.checkable(true);
	}

	checkableFalseFolder(folder) {
		Remote.folderSetCheckable(()=>{}, folder.fullNameRaw, false);
		folder.checkable(false);
	}
}
