import { Scope } from 'Common/Enums';
import { keyScope, leftPanelDisabled, SettingsGet } from 'Common/Globals';
import { addObservablesTo } from 'Common/Utils';
import { ThemeStore } from 'Stores/Theme';

export const AppUserStore = {
	populate: () => {
		AppUserStore.contactsIsAllowed(!!SettingsGet('ContactsIsAllowed'));
	}
};

addObservablesTo(AppUserStore, {
	currentAudio: '',

	focusedState: Scope.None,

	threadsAllowed: false,

	composeInEdit: false,

	contactsIsAllowed: false
});

AppUserStore.focusedState.subscribe(value => {
	switch (value) {
		case Scope.MessageList:
		case Scope.MessageView:
		case Scope.FolderList:
			keyScope(value);
			ThemeStore.isMobile() && leftPanelDisabled(Scope.FolderList !== value);
			break;
	}
});
