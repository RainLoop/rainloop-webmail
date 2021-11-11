import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
import { MessageUserStore } from 'Stores/User/Message';

import { Capa, Scope } from 'Common/Enums';
import { settings } from 'Common/Links';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { KeyboardShortcutsHelpPopupView } from 'View/Popup/KeyboardShortcutsHelp';
import { AccountPopupView } from 'View/Popup/Account';
import { ContactsPopupView } from 'View/Popup/Contacts';

import { doc, Settings, leftPanelDisabled } from 'Common/Globals';

import { ThemeStore } from 'Stores/Theme';

//import Remote from 'Remote/User/Fetch';

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
/* TODO
		event.preventDefault();
		event.stopPropagation();
		Remote.switchAccount(
			(iError, oData) => {
				if (iError) {
					console.dir({
						iError: iError,
						oData: oData
					})
				} else {
					rl.setData(oData.Result);
//					rl.route.reload();
				}
			},
			account.email
		);
*/
		if (account && 0 === event.button) {
			AccountUserStore.loading(true);
			setTimeout(() => AccountUserStore.loading(false), 1000);
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
//		location.reload();
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
