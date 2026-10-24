import { AbstractViewPopup } from 'Knoin/AbstractViews';
import { addObservablesTo } from 'External/ko';
import Remote from 'Remote/User/Fetch';

export class FolderACLPopupView extends AbstractViewPopup {
	constructor() {
		super('FolderACL');
		addObservablesTo(this, {
			create: false,
			mine: false,
			folderName: '',
			identifier: ''
		});
		this.rights = ko.observableArray();
	}

	submitForm(/*form*/) {
		if (!this.mine()) {
			const rights = this.rights();
			Remote.request('FolderSetACL',
				(iError, data) => {
					if (!iError && data.Result) {
						const acl = this.acl;
						if (!acl.identifier) {
							this.folder.ACL.push(acl);
						}
						acl.rights = rights;
					}
				}, {
					folder: this.folderName(),
					identifier: this.identifier(),
					rights: rights.join('')
				}
			);
		}
		this.close();
	}

	beforeShow(folder, acl) {
		this.folder = folder;
		this.create(!acl.identifier());
		this.mine(acl.mine());
		this.acl = acl;
/*
		this.ACLAllowed && Remote.request('FolderIdentifierRights', (iError, data) => {
			if (!iError && data.Result) {
				this.rights(data.Result.rights.split(''));
			}
		}, {
			folder: folder.fullName,
			identifier: acl.identifier
		});
*/
		this.folderName(folder.fullName);
		this.identifier(acl.identifier());
		this.rights(acl.rights());
	}
}
