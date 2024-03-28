import { AbstractViewPopup } from 'Knoin/AbstractViews';
import { addObservablesTo, koComputable } from 'External/ko';
import Remote from 'Remote/User/Fetch';
import { FolderUserStore } from 'Stores/User/Folder';

import { getFolderFromCacheList, setFolder, removeFolderFromCacheList } from 'Common/Cache';
import { Notifications } from 'Common/Enums';
import { FolderMetadataKeys } from 'Common/EnumsUser';
import { folderListOptionsBuilder, sortFolders } from 'Common/Folders';
import { initOnStartOrLangChange, i18n, getNotification } from 'Common/Translator';
import { defaultOptionsAfterRender } from 'Common/Utils';

export class FolderPopupView extends AbstractViewPopup {
	constructor() {
		super('Folder');
		addObservablesTo(this, {
			folder: null, // FolderModel
			parentFolder: '',
			name: '',
			editing: false
		});
		this.ACLAllowed = FolderUserStore.hasCapability('ACL');
		this.ACL = ko.observableArray();

		this.parentFolderSelectList = koComputable(() =>
			folderListOptionsBuilder(
				[],
				[['', '']],
				oItem => oItem ? oItem.detailedName() : '',
				item => !item.subFolders.allow
					|| (FolderUserStore.namespace && !item.fullName.startsWith(FolderUserStore.namespace))
			)
		);

		this.displaySpecSetting = FolderUserStore.displaySpecSetting;

		this.showKolab = FolderUserStore.allowKolab();
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

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
	}

	afterHide() {
		this.editing(false);
	}

	submitForm(/*form*/) {
		const
			folder = this.folder(),
			nameToEdit = this.name().trim(),
			newParentName = this.parentFolder(),
			oldParent = getFolderFromCacheList(folder.parentName),
			newParent = getFolderFromCacheList(newParentName),
			folderList = FolderUserStore.folderList,
			newFolderList = newParent ? newParent.subFolders : folderList,
			delimiter = (newParent || folder).delimiter,
			oldFullname = folder.fullName,
			newFullname = (newParent ? newParentName + delimiter : '') + nameToEdit;
		if (nameToEdit && newFullname != oldFullname) {
			Remote.abort('Folders').post('FolderRename', FolderUserStore.foldersRenaming, {
				oldName: oldFullname,
				newName: newFullname,
				// toggleFolderSubscription / FolderSubscribe
				subscribe: folder.isSubscribed() ? 1 : 0,
				// toggleFolderCheckable / FolderCheckable
				checkable: folder.checkable() ? 1 : 0,
				// toggleFolderKolabType / FolderSetMetadata
				kolab: {
					// TODO: append '.default' ?
					type: FolderMetadataKeys.KolabFolderType,
					value: folder.kolabType()
				}
			})
			.then(() => {
				const
					renameFolder = (folder, parent) => {
						removeFolderFromCacheList(folder.fullName);
						folder.parentName = (parent ? parent.fullName : '');
						folder.fullName = (parent ? parent.fullName + delimiter : '') + folder.name();
						folder.delimiter = delimiter;
						folder.deep = (parent ? parent.deep : -1) + 1;
						setFolder(folder);
					},
					renameChildren = folder => {
						folder.subFolders.forEach(child => {
							renameFolder(child, folder);
							renameChildren(child);
						})
					};
				folder.name(nameToEdit);
				renameFolder(folder, newParent);
				if (folder.subFolders.length || newParent != oldParent) {
					// Rename all subfolders to prevent reload
					renameChildren(folder);
				}
				(oldParent ? oldParent.subFolders : folderList).remove(folder);
				newFolderList.push(folder);
				sortFolders(newFolderList);
			})
			.catch(error => {
				console.error(error);
				FolderUserStore.error(
					getNotification(error.code, '', Notifications.CantRenameFolder) + '.\n' + error.message
				);
			});
		} else {
			Remote.request('FolderSettings', null, {
				folder: folder.fullName,
				// toggleFolderSubscription / FolderSubscribe
				subscribe: folder.isSubscribed() ? 1 : 0,
				// toggleFolderCheckable / FolderCheckable
				checkable: folder.checkable() ? 1 : 0,
				// toggleFolderKolabType / FolderSetMetadata
				kolab: {
					// TODO: append '.default' ?
					type: FolderMetadataKeys.KolabFolderType,
					value: folder.kolabType()
				}
			});
		}

		this.close();
	}

	beforeShow(folder) {
		this.ACL([]);
		this.ACLAllowed && Remote.request('FolderACL', (iError, data) => {
			if (!iError && data.Result) {
				this.ACL(Object.values(data.Result));
			}
		}, {
			folder: folder.fullName
		});
		this.editing(!folder.type() && folder.exists && folder.selectable());
		this.name(folder.name()),
		this.parentFolder(folder.parentName);
		this.folder(folder);
	}
}
