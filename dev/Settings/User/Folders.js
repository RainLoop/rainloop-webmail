import ko from 'ko';

import { Notification } from 'Common/Enums';
import { ClientSideKeyName } from 'Common/EnumsUser';
import { Settings } from 'Common/Globals';
import { getNotification } from 'Common/Translator';

import { removeFolderFromCacheList } from 'Common/Cache';

import * as Local from 'Storage/Client';

import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { FolderCreatePopupView } from 'View/Popup/FolderCreate';
import { FolderSystemPopupView } from 'View/Popup/FolderSystem';

export class FoldersUserSettings {
	constructor() {
		this.displaySpecSetting = FolderUserStore.displaySpecSetting;
		this.folderList = FolderUserStore.folderList;
		this.folderListOptimized = FolderUserStore.folderListOptimized;
		this.folderListError = FolderUserStore.folderListError;
		this.hideUnsubscribed = SettingsUserStore.hideUnsubscribed;

		this.loading = ko.computed(() => {
			const loading = FolderUserStore.foldersLoading(),
				creating = FolderUserStore.foldersCreating(),
				deleting = FolderUserStore.foldersDeleting(),
				renaming = FolderUserStore.foldersRenaming();

			return loading || creating || deleting || renaming;
		});

		this.folderForDeletion = ko.observable(null).deleteAccessHelper();

		this.folderForEdit = ko.observable(null).extend({ toggleSubscribeProperty: [this, 'edited'] });

		this.useImapSubscribe = Settings.app('useImapSubscribe');
		SettingsUserStore.hideUnsubscribed.subscribe(value => Remote.saveSetting('HideUnsubscribed', value ? 1 : 0));
	}

	folderEditOnEnter(folder) {
		const nameToEdit = folder ? folder.nameForEdit().trim() : '';

		if (nameToEdit && folder.name() !== nameToEdit) {
			Local.set(ClientSideKeyName.FoldersLashHash, '');

			rl.app.foldersPromisesActionHelper(
				Remote.folderRename(folder.fullNameRaw, nameToEdit),
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
		FolderUserStore.folderListError('');
	}
/*
	onBuild(oDom) {
	}
*/
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
				Local.set(ClientSideKeyName.FoldersLashHash, '');

				folderToRemove.selectable(false);

				rl.app.foldersPromisesActionHelper(
					Remote.folderDelete(folderToRemove.fullNameRaw),
					Notification.CantDeleteFolder
				);

				removeFolderFromCacheList(folderToRemove.fullNameRaw);
			}
		} else if (0 < folderToRemove.privateMessageCountAll()) {
			FolderUserStore.folderListError(getNotification(Notification.CantDeleteNonEmptyFolder));
		}
	}

	toggleFolderSubscription(folder) {
		let subscribe = !folder.subscribed();
		Local.set(ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(()=>0, folder.fullNameRaw, subscribe);
		folder.subscribed(subscribe);
	}

	toggleFolderCheckable(folder) {
		let checkable = !folder.checkable();
		Remote.folderSetCheckable(()=>0, folder.fullNameRaw, checkable);
		folder.checkable(checkable);
	}
}
