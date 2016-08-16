
import ko from 'ko';

import {Notification} from 'Common/Enums';
import {UNUSED_OPTION_VALUE} from 'Common/Consts';
import {bMobileDevice} from 'Common/Globals';
import {trim, createCommand, defautOptionsAfterRender, folderListOptionsBuilder} from 'Common/Utils';

import FolderStore from 'Stores/User/Folder';

import Promises from 'Promises/User/Ajax';

import {getApp} from 'Helper/Apps/User';

import {view, ViewType} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Popup/FolderCreate',
	type: ViewType.Popup,
	templateID: 'PopupsFolderCreate'
})
class FolderCreateView extends AbstractViewNext
{
	constructor() {
		super();

		this.folderName = ko.observable('');
		this.folderName.focused = ko.observable(false);

		this.selectedParentValue = ko.observable(UNUSED_OPTION_VALUE);

		this.parentFolderSelectList = ko.computed(() => {

			const
				top = [],
				list = FolderStore.folderList(),
				fRenameCallback = (oItem) => (oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '');

			top.push(['', '']);

			let fDisableCallback = null;
			if ('' !== FolderStore.namespace)
			{
				fDisableCallback = (item) => FolderStore.namespace !== item.fullNameRaw.substr(0, FolderStore.namespace.length);
			}

			return folderListOptionsBuilder([], list, [], top, null, fDisableCallback, null, fRenameCallback);

		});

		// commands
		this.createFolder = createCommand(() => {

			let parentFolderName = this.selectedParentValue();
			if ('' === parentFolderName && 1 < FolderStore.namespace.length)
			{
				parentFolderName = FolderStore.namespace.substr(0, FolderStore.namespace.length - 1);
			}

			getApp().foldersPromisesActionHelper(
				Promises.folderCreate(this.folderName(), parentFolderName, FolderStore.foldersCreating),
				Notification.CantCreateFolder
			);

			this.cancelCommand();

		}, () => this.simpleFolderNameValidation(this.folderName()));

		this.defautOptionsAfterRender = defautOptionsAfterRender;
	}

	simpleFolderNameValidation(sName) {
		return (/^[^\\\/]+$/g).test(trim(sName));
	}

	clearPopup() {
		this.folderName('');
		this.selectedParentValue('');
		this.folderName.focused(false);
	}

	onShow() {
		this.clearPopup();
	}

	onShowWithDelay() {
		if (!bMobileDevice)
		{
			this.folderName.focused(true);
		}
	}
}

module.exports = FolderCreateView;
