import { addObservablesTo } from 'External/ko';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import Remote from 'Remote/User/Fetch';

export class FolderPopupView extends AbstractViewPopup {
	constructor() {
		super('Folder');
		addObservablesTo(this, {
			folder: null // FolderModel
		});

		this.ACL = ko.observableArray();
	}

	onClose() {
		this.folder().unedit();
	}

	submitForm(form) {
		this.folder().rename();
		console.dir({form});
		this.close();
	}

	beforeShow(folder) {
		this.ACL([]);
		folder.editing(true);
		this.folder(folder);
		Remote.request('FolderACL', (iError, data) => {
			if (!iError && data.Result) {
				this.ACL(
					Object.entries(data.Result).map(([key, value]) => {
						value.identifier = key;
						return value;
					})
				);
			}
		}, {
			folder: folder.fullName
		});
	}
}
