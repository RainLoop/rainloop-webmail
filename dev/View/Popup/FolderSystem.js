import ko from 'ko';

import { SetSystemFoldersNotification } from 'Common/EnumsUser';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { Settings } from 'Common/Globals';
import { defaultOptionsAfterRender, addSubscribablesTo } from 'Common/Utils';
import { folderListOptionsBuilder } from 'Common/UtilsUser';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import { FolderUserStore } from 'Stores/User/Folder';

import Remote from 'Remote/User/Fetch';

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
				[],
				FolderUserStore.folderList(),
				FolderUserStore.folderListSystemNames(),
				[
					['', this.sChooseOnText],
					[UNUSED_OPTION_VALUE, this.sUnuseText]
				],
				null,
				null,
				null,
				null,
				null,
				true
			)
		);

		this.sentFolder = FolderUserStore.sentFolder;
		this.draftFolder = FolderUserStore.draftFolder;
		this.spamFolder = FolderUserStore.spamFolder;
		this.trashFolder = FolderUserStore.trashFolder;
		this.archiveFolder = FolderUserStore.archiveFolder;

		const settingsSet = Settings.set,
			fSetSystemFolders = () => {
				settingsSet('SentFolder', FolderUserStore.sentFolder());
				settingsSet('DraftFolder', FolderUserStore.draftFolder());
				settingsSet('SpamFolder', FolderUserStore.spamFolder());
				settingsSet('TrashFolder', FolderUserStore.trashFolder());
				settingsSet('ArchiveFolder', FolderUserStore.archiveFolder());
			},
			fSaveSystemFolders = (()=>{
				fSetSystemFolders();
				Remote.saveSystemFolders(()=>{}, {
					SentFolder: FolderUserStore.sentFolder(),
					DraftFolder: FolderUserStore.draftFolder(),
					SpamFolder: FolderUserStore.spamFolder(),
					TrashFolder: FolderUserStore.trashFolder(),
					ArchiveFolder: FolderUserStore.archiveFolder(),
					NullFolder: 'NullFolder'
				});
			}).debounce(1000),
			fCallback = () => {
				fSetSystemFolders();
				fSaveSystemFolders();
			};

		addSubscribablesTo(FolderUserStore, {
			sentFolder: fCallback,
			draftFolder: fCallback,
			spamFolder: fCallback,
			trashFolder: fCallback,
			archiveFolder: fCallback
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
