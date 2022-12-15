import ko from 'ko';
import { koComputable, addSubscribablesTo } from 'External/ko';

import { FolderType } from 'Common/EnumsUser';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { folderListOptionsBuilder } from 'Common/Folders';
import { i18n } from 'Common/Translator';

import { FolderUserStore } from 'Stores/User/Folder';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class FolderSystemPopupView extends AbstractViewPopup {
	constructor() {
		super('FolderSystem');

		this.notification = ko.observable('');

		this.folderSelectList = koComputable(() =>
			folderListOptionsBuilder(
				FolderUserStore.systemFoldersNames(),
				[
					['', i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE')],
					[UNUSED_OPTION_VALUE, i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME')]
				]
			)
		);

		this.sentFolder = FolderUserStore.sentFolder;
		this.draftsFolder = FolderUserStore.draftsFolder;
		this.spamFolder = FolderUserStore.spamFolder;
		this.trashFolder = FolderUserStore.trashFolder;
		this.archiveFolder = FolderUserStore.archiveFolder;

		const fSaveSystemFolders = (()=>FolderUserStore.saveSystemFolders()).debounce(1000);

		addSubscribablesTo(FolderUserStore, {
			sentFolder: fSaveSystemFolders,
			draftsFolder: fSaveSystemFolders,
			spamFolder: fSaveSystemFolders,
			trashFolder: fSaveSystemFolders,
			archiveFolder: fSaveSystemFolders
		});

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
	}

	/**
	 * @param {number=} notificationType = 0
	 */
	onShow(notificationType = 0) {
		let notification = '', prefix = 'POPUPS_SYSTEM_FOLDERS/NOTIFICATION_';
		switch (notificationType) {
			case FolderType.Sent:
				notification = i18n(prefix + 'SENT');
				break;
			case FolderType.Drafts:
				notification = i18n(prefix + 'DRAFTS');
				break;
			case FolderType.Junk:
				notification = i18n(prefix + 'SPAM');
				break;
			case FolderType.Trash:
				notification = i18n(prefix + 'TRASH');
				break;
			case FolderType.Archive:
				notification = i18n(prefix + 'ARCHIVE');
				break;
			// no default
		}

		this.notification(notification);
	}
}
