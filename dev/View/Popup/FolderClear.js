import { i18n, getNotification } from 'Common/Translator';

import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class FolderClearPopupView extends AbstractViewPopup {
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
			MessagelistUserStore([]);

			this.clearingProcess(true);

			folderToClear.totalEmails(0);
			folderToClear.unreadEmails(0);
			folderToClear.hash = '';

			Remote.request('FolderClear', iError => {
				this.clearingProcess(false);
				if (iError) {
					this.clearingError(getNotification(iError));
				} else {
					MessagelistUserStore.reload(true);
					this.close();
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
