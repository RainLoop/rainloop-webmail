import _ from '_';
import ko from 'ko';

import { SetSystemFoldersNotification, Magics } from 'Common/Enums';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { folderListOptionsBuilder, noop, defautOptionsAfterRender } from 'Common/Utils';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import FolderStore from 'Stores/User/Folder';

import * as Settings from 'Storage/Settings';
import Remote from 'Remote/User/Ajax';

import { popup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/FolderSystem',
	templateID: 'PopupsFolderSystem'
})
class FolderSystemPopupView extends AbstractViewNext {
	constructor() {
		super();

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

		const fSetSystemFolders = () => {
				Settings.settingsSet('SentFolder', FolderStore.sentFolder());
				Settings.settingsSet('DraftFolder', FolderStore.draftFolder());
				Settings.settingsSet('SpamFolder', FolderStore.spamFolder());
				Settings.settingsSet('TrashFolder', FolderStore.trashFolder());
				Settings.settingsSet('ArchiveFolder', FolderStore.archiveFolder());
			},
			fSaveSystemFolders = _.debounce(() => {
				fSetSystemFolders();
				Remote.saveSystemFolders(noop, {
					SentFolder: FolderStore.sentFolder(),
					DraftFolder: FolderStore.draftFolder(),
					SpamFolder: FolderStore.spamFolder(),
					TrashFolder: FolderStore.trashFolder(),
					ArchiveFolder: FolderStore.archiveFolder(),
					NullFolder: 'NullFolder'
				});
			}, Magics.Time1s),
			fCallback = () => {
				fSetSystemFolders();
				fSaveSystemFolders();
			};

		FolderStore.sentFolder.subscribe(fCallback);
		FolderStore.draftFolder.subscribe(fCallback);
		FolderStore.spamFolder.subscribe(fCallback);
		FolderStore.trashFolder.subscribe(fCallback);
		FolderStore.archiveFolder.subscribe(fCallback);

		this.defautOptionsAfterRender = defautOptionsAfterRender;
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
