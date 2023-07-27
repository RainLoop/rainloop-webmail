import { addObservablesTo, addComputablesTo } from 'External/ko';
import { i18n, getNotification } from 'Common/Translator';

import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class FolderClearPopupView extends AbstractViewPopup {
	constructor() {
		super('FolderClear');

		addObservablesTo(this, {
			folder: null,
			clearing: false
		});

		addComputablesTo(this, {
			dangerDescHtml: () => {
//				const folder = this.folder();
//				return i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', { FOLDER: folder.fullName.replace(folder.delimiter, ' / ') });
				return i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', { FOLDER: this.folder()?.localName() });
			}
		});

		decorateKoCommands(this, {
			clearCommand: self => !self.clearing()
		});
	}

	clearCommand() {
		const folder = this.folder();
		if (folder) {
			this.clearing(true);
			Remote.request('FolderClear', iError => {
				folder.totalEmails(0);
				folder.unreadEmails(0);
				MessageUserStore.message(null);
				MessagelistUserStore.reload(true, true);
				this.clearing(false);
				iError ? alert(getNotification(iError)) : this.close();
			}, {
				folder: folder.fullName
			});
		}
	}

	onShow(folder) {
		this.clearing(false);
		this.folder(folder);
	}
}
