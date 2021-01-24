import ko from 'ko';

import { SetSystemFoldersNotification } from 'Common/Enums';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { defaultOptionsAfterRender } from 'Common/Utils';
import { folderListOptionsBuilder } from 'Common/UtilsUser';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import FolderStore from 'Stores/User/Folder';

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
				FolderStore.folderList(),
				FolderStore.folderListSystemNames(),
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

		this.sentFolder = FolderStore.sentFolder;
		this.draftFolder = FolderStore.draftFolder;
		this.spamFolder = FolderStore.spamFolder;
		this.trashFolder = FolderStore.trashFolder;
		this.archiveFolder = FolderStore.archiveFolder;

		const settingsSet = rl.settings.set,
			fSetSystemFolders = () => {
				settingsSet('SentFolder', FolderStore.sentFolder());
				settingsSet('DraftFolder', FolderStore.draftFolder());
				settingsSet('SpamFolder', FolderStore.spamFolder());
				settingsSet('TrashFolder', FolderStore.trashFolder());
				settingsSet('ArchiveFolder', FolderStore.archiveFolder());
			},
			fSaveSystemFolders = (()=>{
				fSetSystemFolders();
				Remote.saveSystemFolders(()=>{}, {
					SentFolder: FolderStore.sentFolder(),
					DraftFolder: FolderStore.draftFolder(),
					SpamFolder: FolderStore.spamFolder(),
					TrashFolder: FolderStore.trashFolder(),
					ArchiveFolder: FolderStore.archiveFolder(),
					NullFolder: 'NullFolder'
				});
			}).debounce(1000),
			fCallback = () => {
				fSetSystemFolders();
				fSaveSystemFolders();
			};

		ko.addSubscribablesTo(FolderStore, {
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
		let notification = '';
		switch (notificationType) {
			case SetSystemFoldersNotification.Sent:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SENT');
				break;
			case SetSystemFoldersNotification.Draft:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_DRAFTS');
				break;
			case SetSystemFoldersNotification.Spam:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SPAM');
				break;
			case SetSystemFoldersNotification.Trash:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_TRASH');
				break;
			case SetSystemFoldersNotification.Archive:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_ARCHIVE');
				break;
			// no default
		}

		this.notification(notification);
	}
}

export { FolderSystemPopupView, FolderSystemPopupView as default };
