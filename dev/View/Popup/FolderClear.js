import { i18n, getNotification } from 'Common/Translator';
import { setFolderHash } from 'Common/Cache';

import { MessageUserStore } from 'Stores/User/Message';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class FolderClearPopupView extends AbstractViewPopup {
	constructor() {
		super('FolderClear');

		this.addObservables({
			selectedFolder: null,
			clearingProcess: false,
			clearingError: ''
		});

		this.addComputables({
			dangerDescHtml: () => {
				const folder = this.selectedFolder();
//				return i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', { FOLDER: folder ? folder.fullName.replace(folder.delimiter, ' / ') : '' });
				return i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', { FOLDER: folder ? folder.localName() : '' });
			}
		});

		decorateKoCommands(this, {
			clearCommand: self => {
					const folder = self.selectedFolder();
					return !self.clearingProcess() && null !== folder;
				}
		});
	}

	clearCommand() {
		const folderToClear = this.selectedFolder();
		if (folderToClear) {
			MessageUserStore.message(null);
			MessageUserStore.list([]);

			this.clearingProcess(true);

			folderToClear.messageCountAll(0);
			folderToClear.messageCountUnread(0);

			setFolderHash(folderToClear.fullName, '');

			Remote.request('FolderClear', iError => {
				this.clearingProcess(false);
				if (iError) {
					this.clearingError(getNotification(iError));
				} else {
					rl.app.reloadMessageList(true);
					this.cancelCommand();
				}
			}, {
				Folder: folderToClear.fullName
			});
		}
	}

	onShow(folder) {
		this.clearingProcess(false);
		this.selectedFolder(folder || null);
	}
}

export { FolderClearPopupView, FolderClearPopupView as default };
