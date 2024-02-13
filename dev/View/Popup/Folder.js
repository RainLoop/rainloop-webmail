import { AbstractViewPopup } from 'Knoin/AbstractViews';
import { addObservablesTo, koComputable } from 'External/ko';
import Remote from 'Remote/User/Fetch';
import { FolderUserStore } from 'Stores/User/Folder';

import { defaultOptionsAfterRender } from 'Common/Utils';
import { folderListOptionsBuilder } from 'Common/Folders';

export class FolderPopupView extends AbstractViewPopup {
	constructor() {
		super('Folder');
		addObservablesTo(this, {
			folder: null, // FolderModel
			parentFolder: '',
			name: '',
			editing: false
		});
		this.ACLAllowed = FolderUserStore.hasCapability('ACL');
		this.ACL = ko.observableArray();

		this.parentFolderSelectList = koComputable(() =>
			folderListOptionsBuilder(
				[],
				[['', '']],
				oItem => oItem ? oItem.detailedName() : '',
				item => !item.subFolders.allow
					|| (FolderUserStore.namespace && !item.fullName.startsWith(FolderUserStore.namespace))
			)
		);

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
	}

	afterHide() {
		this.editing(false);
	}

	submitForm(form) {
		this.folder().rename(this.name(), this.parentFolder());
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
		this.editing(!folder.type() && folder.exists && folder.selectable());
		this.name(folder.name()),
		this.parentFolder(folder.parentName);
		this.folder(folder);
	}
}
