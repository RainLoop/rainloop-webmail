import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
//import { FolderUserStore } from 'Stores/User/Folder';

import { ScopeMessageList, ScopeMessageView, ScopeSettings } from 'Common/Enums';
import { settings } from 'Common/Links';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { KeyboardShortcutsHelpPopupView } from 'View/Popup/KeyboardShortcutsHelp';
import { AccountPopupView } from 'View/Popup/Account';
import { ContactsPopupView } from 'View/Popup/Contacts';

import { fireEvent, stopEvent, SettingsCapa, registerShortcut } from 'Common/Globals';

import Remote from 'Remote/User/Fetch';
import { getNotification } from 'Common/Translator';
//import { koComputable } from 'External/ko';
import { addObservablesTo } from 'External/ko';

export class SystemDropDownUserView extends AbstractViewRight {
	constructor() {
		super();

		this.allowAccounts = SettingsCapa('AdditionalAccounts');

		this.accountEmail = AccountUserStore.email;

		this.accounts = AccountUserStore;
		this.accountsLoading = AccountUserStore.loading;
/*
		this.accountsUnreadCount = : koComputable(() => 0);
		this.accountsUnreadCount = : koComputable(() => AccountUserStore().reduce((result, item) => result + item.count(), 0));
*/

		addObservablesTo(this, {
			currentAudio: '',
			// bootstrap dropdown
			accountMenu: null
		});

		this.allowContacts = AppUserStore.allowContacts();

		addEventListener('audio.stop', () => this.currentAudio(''));
		addEventListener('audio.start', e => this.currentAudio(e.detail));
	}

	stopPlay() {
		fireEvent('audio.api.stop');
	}

	accountClick(account, event) {
		let email = account?.email;
		if (email && 0 === event.button && AccountUserStore.email() != email) {
			AccountUserStore.loading(true);
			stopEvent(event);
			Remote.request('AccountSwitch',
				(iError/*, oData*/) => {
					if (iError) {
						AccountUserStore.loading(false);
						alert(getNotification(iError).replace('%EMAIL%', email));
						if (account.isAdditional()) {
							showScreenPopup(AccountPopupView, [account]);
						}
					} else {
/*						// Not working yet
						forEachObjectEntry(oData.Result, (key, value) => rl.settings.set(key, value));
//						MessageUserStore.message();
//						MessageUserStore.purgeCache();
						MessagelistUserStore([]);
//						FolderUserStore.folderList([]);
						loadFolders(value => {
							if (value) {
//								4. Change to INBOX = reload MessageList
//								MessagelistUserStore.setMessageList();
							}
						});
						AccountUserStore.loading(false);
*/
						rl.route.reload();
					}
				}, {Email:email}
			);
		}
		return true;
	}

	accountName() {
		let email = AccountUserStore.email(),
			account = AccountUserStore.find(account => account.email == email);
		return account?.name || email;
	}

	settingsClick() {
		hasher.setHash(settings());
	}

	settingsHelp() {
		showScreenPopup(KeyboardShortcutsHelpPopupView);
	}

	addAccountClick() {
		this.allowAccounts && showScreenPopup(AccountPopupView);
	}

	contactsClick() {
		this.allowContacts && showScreenPopup(ContactsPopupView);
	}

	logoutClick() {
		rl.app.logout();
	}

	onBuild() {
		registerShortcut('m', '', [ScopeMessageList, ScopeMessageView, ScopeSettings], () => {
			if (!this.viewModelDom.hidden) {
//				exitFullscreen();
				this.accountMenu().ddBtn.toggle();
				return false;
			}
		});

		// shortcuts help
		registerShortcut('?,f1,help', '', [ScopeMessageList, ScopeMessageView, ScopeSettings], () => {
			if (!this.viewModelDom.hidden) {
				showScreenPopup(KeyboardShortcutsHelpPopupView);
				return false;
			}
		});
	}
}
