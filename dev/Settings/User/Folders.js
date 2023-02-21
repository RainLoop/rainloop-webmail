import ko from 'ko';

import { Notifications } from 'Common/Enums';
import { FolderMetadataKeys } from 'Common/EnumsUser';
import { getNotification } from 'Common/Translator';

import { getFolderFromCacheList, removeFolderFromCacheList } from 'Common/Cache';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { FolderCreatePopupView } from 'View/Popup/FolderCreate';
import { FolderSystemPopupView } from 'View/Popup/FolderSystem';

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

		SettingsUserStore.hideUnsubscribed.subscribe(value => Remote.saveSetting('HideUnsubscribed', value));
		SettingsUserStore.unhideKolabFolders.subscribe(value => Remote.saveSetting('UnhideKolabFolders', value));
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
//				FolderUserStore.folderListError(getNotification(Notifications.CantDeleteNonEmptyFolder));
				folderToRemove.errorMsg(getNotification(Notifications.CantDeleteNonEmptyFolder));
			} else {
				folderForDeletion(null);

				if (folderToRemove) {
					Remote.abort('Folders').post('FolderDelete', FolderUserStore.foldersDeleting, {
							folder: folderToRemove.fullName
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
									getNotification(error.code, '', Notifications.CantDeleteFolder)
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
			folder: folder.fullName,
			key: FolderMetadataKeys.KolabFolderType,
			value: type
		});
		folder.kolabType(type);
	}

	toggleFolderSubscription(folder) {
		let subscribe = !folder.isSubscribed();
		Remote.request('FolderSubscribe', null, {
			folder: folder.fullName,
			subscribe: subscribe ? 1 : 0
		});
		folder.isSubscribed(subscribe);
	}

	toggleFolderCheckable(folder) {
		let checkable = !folder.checkable();
		Remote.request('FolderCheckable', null, {
			folder: folder.fullName,
			checkable: checkable ? 1 : 0
		});
		folder.checkable(checkable);
	}
}
