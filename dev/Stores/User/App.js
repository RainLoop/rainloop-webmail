import ko from 'ko';
import { KeyState } from 'Common/Enums';
import { Focused } from 'Common/EnumsUser';
import { keyScope, leftPanelDisabled, Settings, SettingsGet } from 'Common/Globals';
import { ThemeStore } from 'Stores/Theme';

export const AppUserStore = {
	attachmentsActions: ko.observableArray(),

	devEmail: '',
	devPassword: '',

	populate: () => {
		AppUserStore.projectHash(SettingsGet('ProjectHash'));

		AppUserStore.contactsAutosave(!!SettingsGet('ContactsAutosave'));
		AppUserStore.useLocalProxyForExternalImages(!!SettingsGet('UseLocalProxyForExternalImages'));

		AppUserStore.contactsIsAllowed(!!SettingsGet('ContactsIsAllowed'));

		const attachmentsActions = Settings.app('attachmentsActions');
		AppUserStore.attachmentsActions(Array.isNotEmpty(attachmentsActions) ? attachmentsActions : []);

		AppUserStore.devEmail = SettingsGet('DevEmail');
		AppUserStore.devPassword = SettingsGet('DevPassword');
	}
};

ko.addObservablesTo(AppUserStore, {
	currentAudio: '',

	focusedState: Focused.None,

	projectHash: '',
	threadsAllowed: false,

	composeInEdit: false,

	contactsAutosave: false,
	useLocalProxyForExternalImages: false,

	contactsIsAllowed: false
});

AppUserStore.focusedState.subscribe(value => {
	switch (value) {
		case Focused.MessageList:
			keyScope(KeyState.MessageList);
			ThemeStore.isMobile() && leftPanelDisabled(true);
			break;
		case Focused.MessageView:
			keyScope(KeyState.MessageView);
			ThemeStore.isMobile() && leftPanelDisabled(true);
			break;
		case Focused.FolderList:
			keyScope(KeyState.FolderList);
			ThemeStore.isMobile() && leftPanelDisabled(false);
			break;
		default:
			break;
	}
});
