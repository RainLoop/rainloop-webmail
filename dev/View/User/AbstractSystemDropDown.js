import AppStore from 'Stores/User/App';
import AccountStore from 'Stores/User/Account';
import MessageStore from 'Stores/User/Message';

import { Capa, KeyState } from 'Common/Enums';
import { settings } from 'Common/Links';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { KeyboardShortcutsHelpPopupView } from 'View/Popup/KeyboardShortcutsHelp';
import { AccountPopupView } from 'View/Popup/Account';
import { ContactsPopupView } from 'View/Popup/Contacts';

import { doc, Settings, leftPanelDisabled } from 'Common/Globals';

import { ThemeStore } from 'Stores/Theme';

export class AbstractSystemDropDownUserView extends AbstractViewRight {
	constructor(name) {
		super(name, 'SystemDropDown');

		this.allowSettings = !!Settings.capa(Capa.Settings);
		this.allowHelp = !!Settings.capa(Capa.Help);

		this.currentAudio = AppStore.currentAudio;

		this.accountEmail = AccountStore.email;

		this.accounts = AccountStore.accounts;
		this.accountsUnreadCount = AccountStore.accountsUnreadCount;

		this.addObservables({
			accountMenuDropdownTrigger: false,
			capaAdditionalAccounts: Settings.capa(Capa.AdditionalAccounts)
		});

		this.allowContacts = !!AppStore.contactsIsAllowed();

		this.addAccountClick = this.addAccountClick.bind(this);

		addEventListener('audio.stop', () => AppStore.currentAudio(''));
		addEventListener('audio.start', e => AppStore.currentAudio(e.detail));
	}

	stopPlay() {
		dispatchEvent(new CustomEvent('audio.api.stop'));
	}

	accountClick(account, event) {
		if (account && 0 === event.button) {
			AccountStore.accounts.loading(true);
			setTimeout(() => AccountStore.accounts.loading(false), 1000);
		}

		return true;
	}

	emailTitle() {
		return AccountStore.email();
	}

	settingsClick() {
		if (Settings.capa(Capa.Settings)) {
			rl.route.setHash(settings());
		}
	}

	settingsHelp() {
		if (Settings.capa(Capa.Help)) {
			showScreenPopup(KeyboardShortcutsHelpPopupView);
		}
	}

	addAccountClick() {
		if (this.capaAdditionalAccounts()) {
			showScreenPopup(AccountPopupView);
		}
	}

	contactsClick() {
		if (this.allowContacts) {
			showScreenPopup(ContactsPopupView);
		}
	}

	layoutDesktop()
	{
		doc.cookie = 'rllayout=desktop';
		ThemeStore.isMobile(false);
		leftPanelDisabled(false);
//		location.reload();
	}

	layoutMobile()
	{
		doc.cookie = 'rllayout=mobile';
		ThemeStore.isMobile(true);
		leftPanelDisabled(true);
//		location.reload();
	}

	logoutClick() {
		rl.app.logout();
	}

	onBuild() {
		shortcuts.add('m,contextmenu', '', [KeyState.MessageList, KeyState.MessageView, KeyState.Settings], () => {
			if (this.viewModelVisible) {
				MessageStore.messageFullScreenMode(false);
				this.accountMenuDropdownTrigger(true);
				return false;
			}
		});

		// shortcuts help
		shortcuts.add('?,f1,help', '', [KeyState.MessageList, KeyState.MessageView, KeyState.Settings], () => {
			if (this.viewModelVisible) {
				showScreenPopup(KeyboardShortcutsHelpPopupView);
				return false;
			}
			return true;
		});
	}
}
