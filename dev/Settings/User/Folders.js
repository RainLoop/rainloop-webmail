import ko from 'ko';

import { Notification } from 'Common/Enums';
import { FolderMetadataKeys } from 'Common/EnumsUser';
import { getNotification } from 'Common/Translator';

import { setFolder, getFolderFromCacheList, removeFolderFromCacheList } from 'Common/Cache';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { sortFolders } from 'Common/Folders';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { FolderCreatePopupView } from 'View/Popup/FolderCreate';
import { FolderSystemPopupView } from 'View/Popup/FolderSystem';
import { loadFolders } from 'Model/FolderCollection';

const folderForDeletion = ko.observable(null).askDeleteHelper();

export class UserSettingsFolders /*extends AbstractViewSettings*/ {
	constructor() {
		this.showKolab = FolderUserStore.allowKolab();
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
		this.unhideKolabFolders = SettingsUserStore.unhideKolabFolders;

		this.loading = FolderUserStore.foldersChanging;

		this.folderForDeletion = folderForDeletion;

		this.folderForEdit = ko.observable(null).extend({ toggleSubscribeProperty: [this, 'editing'] });

		SettingsUserStore.hideUnsubscribed.subscribe(value => Remote.saveSetting('HideUnsubscribed', value));
		SettingsUserStore.unhideKolabFolders.subscribe(value => Remote.saveSetting('UnhideKolabFolders', value));
	}

	folderEditOnEnter(folder) {
		const nameToEdit = folder?.nameForEdit().trim();
		if (nameToEdit && folder.name() !== nameToEdit) {
			Remote.abort('Folders').post('FolderRename', FolderUserStore.foldersRenaming, {
					Folder: folder.fullName,
					NewFolderName: nameToEdit,
					Subscribe: folder.isSubscribed() ? 1 : 0
				})
				.then(data => {
					folder.name(nameToEdit/*data.Name*/);
					if (folder.subFolders.length) {
						Remote.setTrigger(FolderUserStore.foldersLoading, true);
//						clearTimeout(Remote.foldersTimeout);
//						Remote.foldersTimeout = setTimeout(loadFolders, 500);
						setTimeout(loadFolders, 500);
						// TODO: rename all subfolders with folder.delimiter to prevent reload?
					} else {
						removeFolderFromCacheList(folder.fullName);
						folder.fullName = data.Result.FullName;
						setFolder(folder);
						const parent = getFolderFromCacheList(folder.parentName);
						sortFolders(parent ? parent.subFolders : FolderUserStore.folderList);
					}
				})
				.catch(error => {
					FolderUserStore.folderListError(
						getNotification(error.code, '', Notification.CantRenameFolder)
						+ '.\n' + error.message);
				});
		}

//		this.folderForEdit(null);
		folder.editing(false);
	}

	folderEditOnEsc(folder) {
//		this.folderForEdit(null);
		folder?.editing(false);
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
		if (folderToRemove
		 && folderToRemove.canBeDeleted()
		 && folderToRemove.askDelete()
		) {
			if (0 < folderToRemove.totalEmails()) {
//				FolderUserStore.folderListError(getNotification(Notification.CantDeleteNonEmptyFolder));
				folderToRemove.errorMsg(getNotification(Notification.CantDeleteNonEmptyFolder));
			} else {
				folderForDeletion(null);

				if (folderToRemove) {
					Remote.abort('Folders').post('FolderDelete', FolderUserStore.foldersDeleting, {
							Folder: folderToRemove.fullName
						}).then(
							() => {
//								folderToRemove.flags.push('\\nonexistent');
								folderToRemove.selectable(false);
//								folderToRemove.isSubscribed(false);
//								folderToRemove.checkable(false);
								if (!folderToRemove.subFolders.length) {
									removeFolderFromCacheList(folderToRemove.fullName);
									const folder = getFolderFromCacheList(folderToRemove.parentName);
									(folder ? folder.subFolders : FolderUserStore.folderList).remove(folderToRemove);
								}
							},
							error => {
								FolderUserStore.folderListError(
									getNotification(error.code, '', Notification.CantDeleteFolder)
									+ '.\n' + error.message
								);
							}
						);
				}
			}
		}
	}

	hideError() {
		this.folderListError('');
	}

	toggleFolderKolabType(folder, event) {
		let type = event.target.value;
		// TODO: append '.default' ?
		Remote.request('FolderSetMetadata', null, {
			Folder: folder.fullName,
			Key: FolderMetadataKeys.KolabFolderType,
			Value: type
		});
		folder.kolabType(type);
	}

	toggleFolderSubscription(folder) {
		let subscribe = !folder.isSubscribed();
		Remote.request('FolderSubscribe', null, {
			Folder: folder.fullName,
			Subscribe: subscribe ? 1 : 0
		});
		folder.isSubscribed(subscribe);
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
