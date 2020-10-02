import ko from 'ko';

import AppStore from 'Stores/User/App';
import AccountStore from 'Stores/User/Account';
import MessageStore from 'Stores/User/Message';

import { Capa, KeyState } from 'Common/Enums';
import { settings } from 'Common/Links';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

const Settings = rl.settings;

class AbstractSystemDropDownUserView extends AbstractViewNext {
	constructor() {
		super();

		this.logoImg = (Settings.get('UserLogo')||'').trim();
		this.logoTitle = (Settings.get('UserLogoTitle')||'').trim();

		this.mobile = !!Settings.app('mobile');
		this.mobileDevice = !!Settings.app('mobileDevice');

		this.allowSettings = !!Settings.capa(Capa.Settings);
		this.allowHelp = !!Settings.capa(Capa.Help);

		this.currentAudio = AppStore.currentAudio;

		this.accountEmail = AccountStore.email;

		this.accounts = AccountStore.accounts;
		this.accountsUnreadCount = AccountStore.accountsUnreadCount;

		this.accountMenuDropdownTrigger = ko.observable(false);
		this.capaAdditionalAccounts = ko.observable(Settings.capa(Capa.AdditionalAccounts));

		this.addAccountClick = this.addAccountClick.bind(this);

		addEventListener('audio.stop', () => AppStore.currentAudio(''));
		addEventListener('audio.start', e => AppStore.currentAudio(e.detail));
	}

	stopPlay() {
		dispatchEvent(new CustomEvent('audio.api.stop'));
	}

	accountClick(account, event) {
		if (account && event && undefined !== event.which && 1 === event.which) {
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
			showScreenPopup(require('View/Popup/KeyboardShortcutsHelp'));
		}
	}

	addAccountClick() {
		if (this.capaAdditionalAccounts()) {
			showScreenPopup(require('View/Popup/Account'));
		}
	}

	logoutClick() {
		rl.app.logout();
	}

	onBuild() {
		shortcuts.add('`', '', [KeyState.MessageList, KeyState.MessageView, KeyState.Settings], () => {
			if (this.viewModelVisible) {
				MessageStore.messageFullScreenMode(false);
				this.accountMenuDropdownTrigger(true);
			}
		});

		// shortcuts help
		shortcuts.add('/', 'shift', [KeyState.MessageList, KeyState.MessageView, KeyState.Settings], () => {
			if (this.viewModelVisible) {
				showScreenPopup(require('View/Popup/KeyboardShortcutsHelp'));
				return false;
			}
			return true;
		});
	}
}

export { AbstractSystemDropDownUserView, AbstractSystemDropDownUserView as default };
