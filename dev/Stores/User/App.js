import ko from 'ko';
import { Focused, KeyState } from 'Common/Enums';

import { keyScope, leftPanelDisabled } from 'Common/Globals';

const Settings = rl.settings;

class AppUserStore {
	constructor() {
		this.currentAudio = ko.observable('');

		this.focusedState = ko.observable(Focused.None);

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

		this.projectHash = ko.observable('');
		this.threadsAllowed = ko.observable(false);

		this.composeInEdit = ko.observable(false);

		this.contactsAutosave = ko.observable(false);
		this.useLocalProxyForExternalImages = ko.observable(false);

		this.contactsIsAllowed = ko.observable(false);

		this.attachmentsActions = ko.observableArray([]);

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
