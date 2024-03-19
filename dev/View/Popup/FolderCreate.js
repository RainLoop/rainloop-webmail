import { koComputable, addObservablesTo } from 'External/ko';

import { Notifications } from 'Common/Enums';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { folderListOptionsBuilder, sortFolders } from 'Common/Folders';
import { getNotification/*, baseCollator*/ } from 'Common/Translator';

import { FolderUserStore } from 'Stores/User/Folder';

import Remote from 'Remote/User/Fetch';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { setFolder, getFolderFromCacheList } from 'Common/Cache';
import { FolderModel } from 'Model/FolderCollection';

export class FolderCreatePopupView extends AbstractViewPopup {
	constructor() {
		super('FolderCreate');

		addObservablesTo(this, {
			name: '',
			subscribe: true,
			parentFolder: ''
		});

		this.parentFolderSelectList = koComputable(() =>
			folderListOptionsBuilder(
				[],
				[['', '']],
				oItem => oItem ? oItem.detailedName() : '',
				item => !item.subFolders.allow
					|| (FolderUserStore.namespace && !item.fullName.startsWith(FolderUserStore.namespace))
			)
		);

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
	}

	submitForm(form) {
		if (form.reportValidity()) {
			const data = new FormData(form);

			let parentFolderName = this.parentFolder();
			if (!parentFolderName && 1 < FolderUserStore.namespace.length) {
				data.set('parent', FolderUserStore.namespace.slice(0, FolderUserStore.namespace.length - 1));
			}

			Remote.abort('Folders').post('FolderCreate', FolderUserStore.foldersCreating, data)
				.then(
					data => {
						const folder = getFolderFromCacheList(parentFolderName),
							subFolder = FolderModel.reviveFromJson(data.Result),
							folders = (folder ? folder.subFolders : FolderUserStore.folderList);
						setFolder(subFolder);
						folders.push(subFolder);
						sortFolders(folders);
/*
						var collator = baseCollator(true);
						console.log((folder ? folder.subFolders : FolderUserStore.folderList).sort(collator.compare));
*/
					},
					error => {
						FolderUserStore.error(
							getNotification(error.code, '', Notifications.CantCreateFolder)
							+ '.\n' + error.message);
					}
				);

			this.close();
		}
	}

	onShow() {
		this.name('');
		this.subscribe(true);
		this.parentFolder('');
	}
}
