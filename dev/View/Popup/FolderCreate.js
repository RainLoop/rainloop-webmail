import ko from 'ko';

import { Notification } from 'Common/Enums';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { folderListOptionsBuilder } from 'Common/UtilsUser';

import FolderStore from 'Stores/User/Folder';

import Remote from 'Remote/User/Fetch';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/FolderCreate',
	templateID: 'PopupsFolderCreate'
})
class FolderCreateView extends AbstractViewNext {
	constructor() {
		super();

		this.addObservables({
			folderName: '',
			folderNameFocused: false,

			selectedParentValue: UNUSED_OPTION_VALUE
		});

		this.parentFolderSelectList = ko.computed(() => {
			const top = [],
				list = FolderStore.folderList(),
				fRenameCallback = (oItem) =>
					oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '';

			top.push(['', '']);

			let fDisableCallback = null;
			if (FolderStore.namespace) {
				fDisableCallback = (item) => FolderStore.namespace !== item.fullNameRaw.substr(0, FolderStore.namespace.length);
			}

			return folderListOptionsBuilder([], list, [], top, null, fDisableCallback, null, fRenameCallback);
		});

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
	}

	@command((self) => self.simpleFolderNameValidation(self.folderName()))
	createFolderCommand() {
		let parentFolderName = this.selectedParentValue();
		if (!parentFolderName && 1 < FolderStore.namespace.length) {
			parentFolderName = FolderStore.namespace.substr(0, FolderStore.namespace.length - 1);
		}

		rl.app.foldersPromisesActionHelper(
			Remote.folderCreate(this.folderName(), parentFolderName, FolderStore.foldersCreating),
			Notification.CantCreateFolder
		);

		this.cancelCommand();
	}

	simpleFolderNameValidation(sName) {
		return /^[^\\/]+$/g.test(sName.trim());
	}

	clearPopup() {
		this.folderName('');
		this.selectedParentValue('');
		this.folderNameFocused(false);
	}

	onShow() {
		this.clearPopup();
	}

	onShowWithDelay() {
//		rl.settings.app('mobile') ||
		this.folderNameFocused(true);
	}
}

export { FolderCreateView, FolderCreateView as default };
