import ko from 'ko';

import { Notification } from 'Common/Enums';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { folderListOptionsBuilder, sortFolders } from 'Common/UtilsUser';
import { getNotification } from 'Common/Translator';

import { FolderUserStore } from 'Stores/User/Folder';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { setFolder, getFolderFromCacheList } from 'Common/Cache';
import { FolderModel } from 'Model/FolderCollection';

class FolderCreatePopupView extends AbstractViewPopup {
	constructor() {
		super('FolderCreate');

		this.addObservables({
			folderName: '',

			selectedParentValue: UNUSED_OPTION_VALUE
		});

		this.parentFolderSelectList = ko.computed(() =>
			folderListOptionsBuilder(
				[],
				[['', '']],
				oItem =>
					oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '',
				FolderUserStore.namespace
					? item => FolderUserStore.namespace !== item.fullName.slice(0, FolderUserStore.namespace.length)
					: null,
				true
			)
		);

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;

		decorateKoCommands(this, {
			createFolderCommand: self => self.simpleFolderNameValidation(self.folderName())
		});
	}

	createFolderCommand() {
		let parentFolderName = this.selectedParentValue();
		if (!parentFolderName && 1 < FolderUserStore.namespace.length) {
			parentFolderName = FolderUserStore.namespace.slice(0, FolderUserStore.namespace.length - 1);
		}

		Remote.abort('Folders').post('FolderCreate', FolderUserStore.foldersCreating, {
				Folder: this.folderName(),
				Parent: parentFolderName
			})
			.then(
				data => {
					const folder = getFolderFromCacheList(parentFolderName),
						subFolder = FolderModel.reviveFromJson(data.Result),
						folders = (folder ? folder.subFolders : FolderUserStore.folderList);
					setFolder(subFolder);
					folders.push(subFolder);
					sortFolders(folders);
/*
					var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
					console.log((folder ? folder.subFolders : FolderUserStore.folderList).sort(collator.compare));
*/
				},
				error => {
					FolderUserStore.folderListError(
						getNotification(error.code, '', Notification.CantCreateFolder)
						+ '.\n' + error.message);
				}
			);

		this.cancelCommand();
	}

	simpleFolderNameValidation(sName) {
		return /^[^\\/]+$/g.test(sName);
	}

	onShow() {
		this.folderName('');
		this.selectedParentValue('');
	}
}

export { FolderCreatePopupView, FolderCreatePopupView as default };
