import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
import { MessageUserStore } from 'Stores/User/Message';
//import { FolderUserStore } from 'Stores/User/Folder';

import { Capa, Scope } from 'Common/Enums';
import { /*root,*/ settings } from 'Common/Links';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { KeyboardShortcutsHelpPopupView } from 'View/Popup/KeyboardShortcutsHelp';
import { AccountPopupView } from 'View/Popup/Account';
import { ContactsPopupView } from 'View/Popup/Contacts';

import { doc, Settings/*, SettingsGet*/, leftPanelDisabled } from 'Common/Globals';

import { ThemeStore } from 'Stores/Theme';

import Remote from 'Remote/User/Fetch';
import { getNotification } from 'Common/Translator';
//import { clearCache } from 'Common/Cache';

export class SystemDropDownUserView extends AbstractViewRight {
	constructor() {
		super('SystemDropDown');

		this.allowAccounts = Settings.capa(Capa.AdditionalAccounts);

		this.accountEmail = AccountUserStore.email;

		this.accounts = AccountUserStore.accounts;
		this.accountsLoading = AccountUserStore.loading;
		this.accountsUnreadCount = AccountUserStore.accountsUnreadCount;

		this.addObservables({
			currentAudio: '',
			accountMenuDropdownTrigger: false
		});

		this.allowContacts = AppUserStore.allowContacts();

		addEventListener('audio.stop', () => this.currentAudio(''));
		addEventListener('audio.start', e => this.currentAudio(e.detail));
	}

	stopPlay() {
		dispatchEvent(new CustomEvent('audio.api.stop'));
	}

	accountClick(account, event) {
		if (account && 0 === event.button) {
			AccountUserStore.loading(true);
			event.preventDefault();
			event.stopPropagation();
			Remote.defaultRequest(
				(iError/*, oData*/) => {
					if (iError) {
						AccountUserStore.loading(false);
						alert(getNotification(iError).replace('%EMAIL%', account.email));
						if (account.canBeEdit()) {
							showScreenPopup(AccountPopupView, [account]);
						}
					} else {
/*						// Not working yet
						Object.entries(oData.Result).forEach((key, value) => rl.settings.set(key, value));
						clearCache();
//						MessageUserStore.setMessage();
//						MessageUserStore.purgeMessageBodyCache();
//						MessageUserStore.hideMessageBodies();
						MessageUserStore.list([]);
//						FolderUserStore.folderList([]);
						Remote.foldersReload(value => {
							if (value) {
								value = SettingsGet('StartupUrl');
								rl.route.setHash(root(value), true);
//								4. Change to INBOX = reload MessageList
//								MessageUserStore.setMessageList();
							}
						});
						AccountUserStore.loading(false);
*/
//						rl.route.reload();
						location.reload();
					}
				}, 'AccountSwitch', {Email:account.email}
			);
		}
		return true;
	}

	emailTitle() {
		return AccountUserStore.email();
	}

	settingsClick() {
		rl.route.setHash(settings());
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

	toggleLayout()
	{
		const mobile = !ThemeStore.isMobile();
		doc.cookie = 'rllayout=' + (mobile ? 'mobile' : 'desktop');
		ThemeStore.isMobile(mobile);
		leftPanelDisabled(mobile);
	}

	logoutClick() {
		rl.app.logout();
	}

	onBuild() {
		shortcuts.add('m,contextmenu', '', [Scope.MessageList, Scope.MessageView, Scope.Settings], () => {
			if (!this.viewModelDom.hidden) {
				MessageUserStore.messageFullScreenMode(false);
				this.accountMenuDropdownTrigger(true);
				return false;
			}
		});

		// shortcuts help
		shortcuts.add('?,f1,help', '', [Scope.MessageList, Scope.MessageView, Scope.Settings], () => {
			if (!this.viewModelDom.hidden) {
				showScreenPopup(KeyboardShortcutsHelpPopupView);
				return false;
			}
		});
	}
}
