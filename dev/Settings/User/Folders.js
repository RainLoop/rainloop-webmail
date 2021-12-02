import ko from 'ko';

import { Notification } from 'Common/Enums';
import { ClientSideKeyName, FolderMetadataKeys } from 'Common/EnumsUser';
import { Settings } from 'Common/Globals';
import { getNotification } from 'Common/Translator';

import { removeFolderFromCacheList } from 'Common/Cache';
import { Capa } from 'Common/Enums';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import * as Local from 'Storage/Client';

import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { FolderCreatePopupView } from 'View/Popup/FolderCreate';
import { FolderSystemPopupView } from 'View/Popup/FolderSystem';

const folderForDeletion = ko.observable(null).deleteAccessHelper();

export class FoldersUserSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.showKolab = ko.computed(() => FolderUserStore.hasCapability('METADATA') && Settings.capa(Capa.Kolab));
		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
		this.kolabTypeOptions = ko.observableArray();
		let i18nFilter = key => i18n('SETTINGS_FOLDERS/TYPE_' + key);
		initOnStartOrLangChange(()=>{
			this.kolabTypeOptions([
				{ id: '', name: '' },
				{ id: 'event', name: i18nFilter('CALENDAR') },
				{ id: 'contact', name: i18nFilter('CONTACTS') },
				{ id: 'task', name: i18nFilter('TASKS') },
				{ id: 'note', name: i18nFilter('NOTES') },
				{ id: 'file', name: i18nFilter('FILES') },
				{ id: 'journal', name: i18nFilter('JOURNAL') },
				{ id: 'configuration', name: i18nFilter('CONFIGURATION') }
			]);
		});

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

		this.folderForDeletion = folderForDeletion;

		this.folderForEdit = ko.observable(null).extend({ toggleSubscribeProperty: [this, 'edited'] });

		this.useImapSubscribe = Settings.app('useImapSubscribe');
		SettingsUserStore.hideUnsubscribed.subscribe(value => Remote.saveSetting('HideUnsubscribed', value ? 1 : 0));
	}

	folderEditOnEnter(folder) {
		const nameToEdit = folder ? folder.nameForEdit().trim() : '';

		if (nameToEdit && folder.name() !== nameToEdit) {
			Local.set(ClientSideKeyName.FoldersLashHash, '');

			rl.app.foldersPromisesActionHelper(
				Remote.post('FolderRename', FolderUserStore.foldersRenaming, {
					Folder: folder.fullName,
					NewFolderName: nameToEdit
				}),
				Notification.CantRenameFolder
			);

			removeFolderFromCacheList(folder.fullName);

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
			folderForDeletion(null);

			if (folderToRemove) {
				Local.set(ClientSideKeyName.FoldersLashHash, '');

				// rl.app.foldersPromisesActionHelper
				Remote.abort('Folders').post('FolderDelete', FolderUserStore.foldersDeleting, {
						Folder: folderToRemove.fullName
					}).then(
						() => {
							folderToRemove.selectable(false)
							removeFolderFromCacheList(folderToRemove.fullName);
							FolderUserStore.folderList(FolderUserStore.folderList.filter(folder => folder !== folderToRemove));
						},
						error => {
							FolderUserStore.folderListError(
								getNotification(error.code, '', Notification.CantDeleteFolder)
								+ '.\n' + error.message
							);
						}
					);
			}
		} else if (0 < folderToRemove.privateMessageCountAll()) {
			FolderUserStore.folderListError(getNotification(Notification.CantDeleteNonEmptyFolder));
		}
	}

	toggleFolderKolabType(folder, event) {
		let type = event.target.value;
		// TODO: append '.default' ?
		Remote.folderSetMetadata(null, folder.fullName, FolderMetadataKeys.KolabFolderType, type);
		folder.kolabType(type);
	}

	toggleFolderSubscription(folder) {
		let subscribe = !folder.subscribed();
		Local.set(ClientSideKeyName.FoldersLashHash, '');
		Remote.request('FolderSubscribe', null, {
			Folder: folder.fullName,
			Subscribe: subscribe ? 1 : 0
		});
		folder.subscribed(subscribe);
	}

	toggleFolderCheckable(folder) {
		let checkable = !folder.checkable();
		Remote.request('FolderCheckable', null, {
			Folder: folder.fullName,
			Checkable: checkable ? 1 : 0
		});
		folder.checkable(checkable);
	}
}
