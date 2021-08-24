import ko from 'ko';

import { SetSystemFoldersNotification } from 'Common/EnumsUser';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { defaultOptionsAfterRender, addSubscribablesTo } from 'Common/Utils';
import { folderListOptionsBuilder } from 'Common/UtilsUser';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import { FolderUserStore } from 'Stores/User/Folder';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

class FolderSystemPopupView extends AbstractViewPopup {
	constructor() {
		super('FolderSystem');

		this.sChooseOnText = '';
		this.sUnuseText = '';

		initOnStartOrLangChange(() => {
			this.sChooseOnText = i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE');
			this.sUnuseText = i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME');
		});

		this.notification = ko.observable('');

		this.folderSelectList = ko.computed(() =>
			folderListOptionsBuilder(
				FolderUserStore.folderListSystemNames(),
				[
					['', this.sChooseOnText],
					[UNUSED_OPTION_VALUE, this.sUnuseText]
				]
			)
		);

		this.sentFolder = FolderUserStore.sentFolder;
		this.draftFolder = FolderUserStore.draftFolder;
		this.spamFolder = FolderUserStore.spamFolder;
		this.trashFolder = FolderUserStore.trashFolder;
		this.archiveFolder = FolderUserStore.archiveFolder;

		const fSaveSystemFolders = (()=>FolderUserStore.saveSystemFolders()).debounce(1000);

		addSubscribablesTo(FolderUserStore, {
			sentFolder: fSaveSystemFolders,
			draftFolder: fSaveSystemFolders,
			spamFolder: fSaveSystemFolders,
			trashFolder: fSaveSystemFolders,
			archiveFolder: fSaveSystemFolders
		});

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
	}

	/**
	 * @param {number=} notificationType = SetSystemFoldersNotification.None
	 */
	onShow(notificationType = SetSystemFoldersNotification.None) {
		let notification = '', prefix = 'POPUPS_SYSTEM_FOLDERS/NOTIFICATION_';
		switch (notificationType) {
			case SetSystemFoldersNotification.Sent:
				notification = i18n(prefix + 'SENT');
				break;
			case SetSystemFoldersNotification.Draft:
				notification = i18n(prefix + 'DRAFTS');
				break;
			case SetSystemFoldersNotification.Spam:
				notification = i18n(prefix + 'SPAM');
				break;
			case SetSystemFoldersNotification.Trash:
				notification = i18n(prefix + 'TRASH');
				break;
			case SetSystemFoldersNotification.Archive:
				notification = i18n(prefix + 'ARCHIVE');
				break;
			// no default
		}

		this.notification(notification);
	}
}

export { FolderSystemPopupView, FolderSystemPopupView as default };
