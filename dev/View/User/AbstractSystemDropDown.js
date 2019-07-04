import _ from '_';
import ko from 'ko';
import key from 'key';

import AppStore from 'Stores/User/App';
import AccountStore from 'Stores/User/Account';
import MessageStore from 'Stores/User/Message';

import { Capa, Magics, KeyState } from 'Common/Enums';
import { trim, isUnd } from 'Common/Utils';
import { settings } from 'Common/Links';

import * as Events from 'Common/Events';
import * as Settings from 'Storage/Settings';

import { getApp } from 'Helper/Apps/User';

import { showScreenPopup, setHash } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

class AbstractSystemDropDownUserView extends AbstractViewNext {
	constructor() {
		super();

		this.logoImg = trim(Settings.settingsGet('UserLogo'));
		this.logoTitle = trim(Settings.settingsGet('UserLogoTitle'));

		this.mobile = !!Settings.appSettingsGet('mobile');
		this.mobileDevice = !!Settings.appSettingsGet('mobileDevice');

		this.allowSettings = !!Settings.capa(Capa.Settings);
		this.allowHelp = !!Settings.capa(Capa.Help);

		this.currentAudio = AppStore.currentAudio;

		this.accountEmail = AccountStore.email;

		this.accounts = AccountStore.accounts;
		this.accountsUnreadCount = AccountStore.accountsUnreadCount;

		this.accountMenuDropdownTrigger = ko.observable(false);
		this.capaAdditionalAccounts = ko.observable(Settings.capa(Capa.AdditionalAccounts));

		this.addAccountClick = _.bind(this.addAccountClick, this);

		Events.sub('audio.stop', () => AppStore.currentAudio(''));
		Events.sub('audio.start', (name) => AppStore.currentAudio(name));
	}

	stopPlay() {
		Events.pub('audio.api.stop');
	}

	accountClick(account, event) {
		if (account && event && !isUnd(event.which) && 1 === event.which) {
			AccountStore.accounts.loading(true);
			_.delay(() => AccountStore.accounts.loading(false), Magics.Time1s);
		}

		return true;
	}

	emailTitle() {
		return AccountStore.email();
	}

	settingsClick() {
		if (Settings.capa(Capa.Settings)) {
			setHash(settings());
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
		getApp().logout();
	}

	onBuild() {
		key('`', [KeyState.MessageList, KeyState.MessageView, KeyState.Settings], () => {
			if (this.viewModelVisibility()) {
				MessageStore.messageFullScreenMode(false);
				this.accountMenuDropdownTrigger(true);
			}
		});

		// shortcuts help
		key('shift+/', [KeyState.MessageList, KeyState.MessageView, KeyState.Settings], () => {
			if (this.viewModelVisibility()) {
				showScreenPopup(require('View/Popup/KeyboardShortcutsHelp'));
				return false;
			}
			return true;
		});
	}
}

export { AbstractSystemDropDownUserView, AbstractSystemDropDownUserView as default };
