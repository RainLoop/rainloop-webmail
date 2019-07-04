import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { i18n, getNotification } from 'Common/Translator';
import { setFolderHash } from 'Common/Cache';

import MessageStore from 'Stores/User/Message';

import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/FolderClear',
	templateID: 'PopupsFolderClear'
})
class FolderClearPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.selectedFolder = ko.observable(null);
		this.clearingProcess = ko.observable(false);
		this.clearingError = ko.observable('');

		this.folderFullNameForClear = ko.computed(() => {
			const folder = this.selectedFolder();
			return folder ? folder.printableFullName() : '';
		});

		this.folderNameForClear = ko.computed(() => {
			const folder = this.selectedFolder();
			return folder ? folder.localName() : '';
		});

		this.dangerDescHtml = ko.computed(() =>
			i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', { 'FOLDER': this.folderNameForClear() })
		);
	}

	@command((self) => {
		const folder = self.selectedFolder(),
			isClearing = self.clearingProcess();

		return !isClearing && null !== folder;
	})
	clearCommand() {
		const folderToClear = this.selectedFolder();
		if (folderToClear) {
			MessageStore.message(null);
			MessageStore.messageList([]);

			this.clearingProcess(true);

			folderToClear.messageCountAll(0);
			folderToClear.messageCountUnread(0);

			setFolderHash(folderToClear.fullNameRaw, '');

			Remote.folderClear((result, data) => {
				this.clearingProcess(false);
				if (StorageResultType.Success === result && data && data.Result) {
					getApp().reloadMessageList(true);
					this.cancelCommand();
				} else {
					if (data && data.ErrorCode) {
						this.clearingError(getNotification(data.ErrorCode));
					} else {
						this.clearingError(getNotification(Notification.MailServerError));
					}
				}
			}, folderToClear.fullNameRaw);
		}
	}

	clearPopup() {
		this.clearingProcess(false);
		this.selectedFolder(null);
	}

	onShow(folder) {
		this.clearPopup();
		if (folder) {
			this.selectedFolder(folder);
		}
	}
}

export { FolderClearPopupView, FolderClearPopupView as default };
