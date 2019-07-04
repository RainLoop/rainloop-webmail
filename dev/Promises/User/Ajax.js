import window from 'window';

import PromisesPopulator from 'Promises/User/Populator';
import { AbstractAjaxPromises } from 'Promises/AbstractAjax';

class UserAjaxUserPromises extends AbstractAjaxPromises {
	constructor() {
		super();

		this.foldersTimeout = 0;
	}

	foldersReload(fTrigger) {
		return this.abort('Folders')
			.postRequest('Folders', fTrigger)
			.then((data) => {
				PromisesPopulator.foldersList(data.Result);
				PromisesPopulator.foldersAdditionalParameters(data.Result);
				return true;
			});
	}

	foldersReloadWithTimeout(fTrigger) {
		this.setTrigger(fTrigger, true);

		window.clearTimeout(this.foldersTimeout);
		this.foldersTimeout = window.setTimeout(() => {
			this.foldersReload(fTrigger);
		}, 500);
	}

	folderDelete(sFolderFullNameRaw, fTrigger) {
		return this.postRequest('FolderDelete', fTrigger, {
			'Folder': sFolderFullNameRaw
		});
	}

	folderCreate(sNewFolderName, sParentName, fTrigger) {
		return this.postRequest('FolderCreate', fTrigger, {
			'Folder': sNewFolderName,
			'Parent': sParentName
		});
	}

	folderRename(sPrevFolderFullNameRaw, sNewFolderName, fTrigger) {
		return this.postRequest('FolderRename', fTrigger, {
			'Folder': sPrevFolderFullNameRaw,
			'NewFolderName': sNewFolderName
		});
	}

	attachmentsActions(sAction, aHashes, fTrigger) {
		return this.postRequest('AttachmentsActions', fTrigger, {
			'Do': sAction,
			'Hashes': aHashes
		});
	}

	welcomeClose() {
		return this.postRequest('WelcomeClose');
	}
}

export default new UserAjaxUserPromises();
