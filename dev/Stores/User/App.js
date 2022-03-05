import { keyScope, leftPanelDisabled, SettingsGet, elementById } from 'Common/Globals';
import { addObservablesTo } from 'External/ko';
import { ThemeStore } from 'Stores/Theme';

export const AppUserStore = {
	allowContacts: () => !!SettingsGet('ContactsIsAllowed')
};

addObservablesTo(AppUserStore, {
	focusedState: 'none',

	threadsAllowed: false,

	composeInEdit: false
});

AppUserStore.focusedState.subscribe(value => {
	['FolderList','MessageList','MessageView'].forEach(name => {
		if (name === value) {
			keyScope(value);
			ThemeStore.isMobile() && leftPanelDisabled('FolderList' !== value);
		}
		let dom = elementById('V-Mail'+name);
		dom && dom.classList.toggle('focused', name === value);
	});
});
