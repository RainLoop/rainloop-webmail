import { keyScope, leftPanelDisabled, SettingsGet, elementById } from 'Common/Globals';
import { addObservablesTo } from 'External/ko';
import { ThemeStore } from 'Stores/Theme';
import { arePopupsVisible } from 'Knoin/Knoin';

export const AppUserStore = {
	allowContacts: () => !!SettingsGet('contactsAllowed')
};

addObservablesTo(AppUserStore, {
	focusedState: 'none',

	threadsAllowed: false
});

AppUserStore.focusedState.subscribe(value => {
	['FolderList','MessageList','MessageView'].forEach(name => {
		if (name === value) {
			arePopupsVisible() || keyScope(value);
			ThemeStore.isMobile() && leftPanelDisabled('FolderList' !== value);
		}
		let dom = elementById('V-Mail'+name);
		dom?.classList.toggle('focused', name === value);
	});
});
