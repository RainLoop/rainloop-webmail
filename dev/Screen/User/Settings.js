import { ScopeSettings } from 'Common/Enums';
import { keyScope, SettingsCapa } from 'Common/Globals';
import { runSettingsViewModelHooks } from 'Common/Plugins';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';

import { AbstractSettingsScreen, settingsAddViewModel } from 'Screen/AbstractSettings';

import { UserSettingsGeneral } from 'Settings/User/General';
import { UserSettingsContacts } from 'Settings/User/Contacts';
import { UserSettingsAccounts } from 'Settings/User/Accounts';
import { UserSettingsFilters } from 'Settings/User/Filters';
import { UserSettingsSecurity } from 'Settings/User/Security';
import { UserSettingsFolders } from 'Settings/User/Folders';
import { UserSettingsThemes } from 'Settings/User/Themes';

import { SystemDropDownUserView } from 'View/User/SystemDropDown';
import { SettingsMenuUserView } from 'View/User/Settings/Menu';
import { SettingsPaneUserView } from 'View/User/Settings/Pane';

export class SettingsUserScreen extends AbstractSettingsScreen {
	constructor() {
		super([SettingsMenuUserView, SettingsPaneUserView, SystemDropDownUserView]);

		const views = [
			UserSettingsGeneral
		];

		if (AppUserStore.allowContacts()) {
			views.push(UserSettingsContacts);
		}

		if (SettingsCapa('AdditionalAccounts') || SettingsCapa('Identities')) {
			views.push(UserSettingsAccounts);
		}

		// TODO: issue on account switch
		// When current domain has sieve but the new has not, or current has not and the new has
		if (SettingsCapa('Sieve')) {
			views.push(UserSettingsFilters);
		}

		views.push(UserSettingsSecurity);

		views.push(UserSettingsFolders);

		if (SettingsCapa('Themes')) {
			views.push(UserSettingsThemes);
		}

		views.forEach((item, index) =>
			settingsAddViewModel(item, item.name.replace('User', ''),
				(item === UserSettingsAccounts && !SettingsCapa('AdditionalAccounts'))
					? 'SETTINGS_ACCOUNTS/LEGEND_IDENTITIES' : 0,
				0, 0 === index)
		);

		runSettingsViewModelHooks(false);

		initOnStartOrLangChange(
			() => this.sSettingsTitle = i18n('TITLES/SETTINGS'),
			() => this.setSettingsTitle()
		);
	}

	onShow() {
		this.setSettingsTitle();
		keyScope(ScopeSettings);
	}

	setSettingsTitle() {
		const sEmail = AccountUserStore.email();
		rl.setTitle((sEmail ? sEmail + ' - ' :  '') + this.sSettingsTitle);
	}
}
