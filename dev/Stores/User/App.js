import ko from 'ko';
import { Focused, KeyState } from 'Common/Enums';

import { keyScope, leftPanelDisabled } from 'Common/Globals';

const Settings = rl.settings;

class AppUserStore {
	constructor() {
		ko.addObservablesTo(this, {
			currentAudio: '',

			focusedState: Focused.None,

			projectHash: '',
			threadsAllowed: false,

			composeInEdit: false,

			contactsAutosave: false,
			useLocalProxyForExternalImages: false,

			contactsIsAllowed: false
		});

		const isMobile = Settings.app('mobile');

		this.focusedState.subscribe((value) => {
			switch (value) {
				case Focused.MessageList:
					keyScope(KeyState.MessageList);
					if (isMobile) {
						leftPanelDisabled(true);
					}
					break;
				case Focused.MessageView:
					keyScope(KeyState.MessageView);
					if (isMobile) {
						leftPanelDisabled(true);
					}
					break;
				case Focused.FolderList:
					keyScope(KeyState.FolderList);
					if (isMobile) {
						leftPanelDisabled(false);
					}
					break;
				default:
					break;
			}
		});

		this.attachmentsActions = ko.observableArray();

		this.devEmail = '';
		this.devPassword = '';
	}

	populate() {
		this.projectHash(Settings.get('ProjectHash'));

		this.contactsAutosave(!!Settings.get('ContactsAutosave'));
		this.useLocalProxyForExternalImages(!!Settings.get('UseLocalProxyForExternalImages'));

		this.contactsIsAllowed(!!Settings.get('ContactsIsAllowed'));

		const attachmentsActions = Settings.app('attachmentsActions');
		this.attachmentsActions(Array.isNotEmpty(attachmentsActions) ? attachmentsActions : []);

		this.devEmail = Settings.get('DevEmail');
		this.devPassword = Settings.get('DevPassword');
	}
}

export default new AppUserStore();
