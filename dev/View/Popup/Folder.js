import { AbstractViewPopup } from 'Knoin/AbstractViews';
import { addObservablesTo } from 'External/ko';
import Remote from 'Remote/User/Fetch';
import { FolderUserStore } from 'Stores/User/Folder';

export class FolderPopupView extends AbstractViewPopup {
	constructor() {
		super('Folder');
		addObservablesTo(this, {
			folder: null // FolderModel
		});
		this.ACLAllowed = FolderUserStore.hasCapability('ACL');
		this.ACL = ko.observableArray();
	}

	afterHide() {
		this.folder().editing(false);
	}

	submitForm(form) {
		this.folder().rename();
		console.dir({form});
		this.close();
	}

	beforeShow(folder) {
		this.ACL([]);
		this.ACLAllowed && Remote.request('FolderACL', (iError, data) => {
			if (!iError && data.Result) {
				this.ACL(Object.values(data.Result));
			}
		}, {
			folder: folder.fullName
		});
		folder.editing(!folder.type() && folder.exists && folder.selectable());
		this.folder(folder);
	}
}
