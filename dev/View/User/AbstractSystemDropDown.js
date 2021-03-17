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

export class AbstractSystemDropDownUserView extends AbstractViewRight {
	constructor(name) {
		super(name, 'SystemDropDown');

		this.allowSettings = Settings.capa(Capa.Settings);
		this.allowHelp = Settings.capa(Capa.Help);

		this.currentAudio = AppUserStore.currentAudio;

		this.accountEmail = AccountUserStore.email;

		this.accounts = AccountUserStore.accounts;
		this.accountsLoading = AccountUserStore.loading;
		this.accountsUnreadCount = AccountUserStore.accountsUnreadCount;

		this.addObservables({
			accountMenuDropdownTrigger: false,
			capaAdditionalAccounts: Settings.capa(Capa.AdditionalAccounts)
		});

		this.allowContacts = AppUserStore.allowContacts();

		this.addAccountClick = this.addAccountClick.bind(this);

		addEventListener('audio.stop', () => AppUserStore.currentAudio(''));
		addEventListener('audio.start', e => AppUserStore.currentAudio(e.detail));
	}

	stopPlay() {
		dispatchEvent(new CustomEvent('audio.api.stop'));
	}

	accountClick(account, event) {
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
		shortcuts.add('m,contextmenu', '', [Scope.MessageList, Scope.MessageView, Scope.Settings], () => {
			if (this.viewModelVisible) {
				MessageUserStore.messageFullScreenMode(false);
				this.accountMenuDropdownTrigger(true);
				return false;
			}
		});

		// shortcuts help
		shortcuts.add('?,f1,help', '', [Scope.MessageList, Scope.MessageView, Scope.Settings], () => {
			if (this.viewModelVisible) {
				showScreenPopup(KeyboardShortcutsHelpPopupView);
				return false;
			}
			return true;
		});
	}
}
