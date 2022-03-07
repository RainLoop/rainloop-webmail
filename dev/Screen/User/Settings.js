import { Scope } from 'Common/Enums';
import { keyScope, leftPanelDisabled, SettingsCapa } from 'Common/Globals';
import { runSettingsViewModelHooks } from 'Common/Plugins';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
import { ThemeStore } from 'Stores/Theme';

import { AbstractSettingsScreen, settingsAddViewModel } from 'Screen/AbstractSettings';

import { UserSettingsGeneral } from 'Settings/User/General';
import { UserSettingsContacts } from 'Settings/User/Contacts';
import { UserSettingsAccounts } from 'Settings/User/Accounts';
import { UserSettingsFilters } from 'Settings/User/Filters';
import { UserSettingsSecurity } from 'Settings/User/Security';
import { UserSettingsFolders } from 'Settings/User/Folders';
import { UserSettingsThemes } from 'Settings/User/Themes';

import { SystemDropDownUserView } from 'View/User/SystemDropDown';
import { MenuSettingsUserView } from 'View/User/Settings/Menu';
import { PaneSettingsUserView } from 'View/User/Settings/Pane';

export class SettingsUserScreen extends AbstractSettingsScreen {
	constructor() {
		super([SystemDropDownUserView, MenuSettingsUserView, PaneSettingsUserView]);

		const views = [
			UserSettingsGeneral
		];

		if (AppUserStore.allowContacts()) {
			views.push(UserSettingsContacts);
		}

		if (SettingsCapa('AdditionalAccounts') || SettingsCapa('Identities')) {
			views.push(UserSettingsAccounts);
		}

		if (SettingsCapa('Sieve')) {
			views.push(UserSettingsFilters);
		}

		if (SettingsCapa('AutoLogout') || SettingsCapa('OpenPGP') || SettingsCapa('GnuPG')) {
			views.push(UserSettingsSecurity);
		}

		views.push(UserSettingsFolders);

		if (SettingsCapa('Themes')) {
			views.push(UserSettingsThemes);
		}

		views.forEach((item, index) =>
			settingsAddViewModel(item, item.name.replace('User', ''), 0, 0, 0 === index)
		);

		runSettingsViewModelHooks(false);

		initOnStartOrLangChange(
			() => this.sSettingsTitle = i18n('TITLES/SETTINGS'),
			() => this.setSettingsTitle()
		);
	}

	onShow() {
		this.setSettingsTitle();
		keyScope(Scope.Settings);
		ThemeStore.isMobile() && leftPanelDisabled(true);
	}

	setSettingsTitle() {
		const sEmail = AccountUserStore.email();
		rl.setWindowTitle((sEmail ? sEmail + ' - ' :  '') + this.sSettingsTitle);
	}
}
