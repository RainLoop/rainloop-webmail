import { Scope } from 'Common/Enums';
import { keyScope, leftPanelDisabled, SettingsCapa } from 'Common/Globals';
import { runSettingsViewModelHooks } from 'Common/Plugins';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
import { ThemeStore } from 'Stores/Theme';

import { AbstractSettingsScreen, settingsAddViewModel } from 'Screen/AbstractSettings';

import { GeneralUserSettings } from 'Settings/User/General';
import { ContactsUserSettings } from 'Settings/User/Contacts';
import { AccountsUserSettings } from 'Settings/User/Accounts';
import { FiltersUserSettings } from 'Settings/User/Filters';
import { SecurityUserSettings } from 'Settings/User/Security';
import { FoldersUserSettings } from 'Settings/User/Folders';
import { ThemesUserSettings } from 'Settings/User/Themes';
import { OpenPgpUserSettings } from 'Settings/User/OpenPgp';

import { SystemDropDownUserView } from 'View/User/SystemDropDown';
import { MenuSettingsUserView } from 'View/User/Settings/Menu';
import { PaneSettingsUserView } from 'View/User/Settings/Pane';

export class SettingsUserScreen extends AbstractSettingsScreen {
	constructor() {
		super([SystemDropDownUserView, MenuSettingsUserView, PaneSettingsUserView]);

		settingsAddViewModel(GeneralUserSettings, 'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

		if (AppUserStore.allowContacts()) {
			settingsAddViewModel(ContactsUserSettings, 'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');
		}

		if (SettingsCapa('AdditionalAccounts') || SettingsCapa('Identities')) {
			settingsAddViewModel(
				AccountsUserSettings,
				'SettingsAccounts',
				SettingsCapa('AdditionalAccounts')
					? 'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME'
					: 'SETTINGS_LABELS/LABEL_IDENTITIES_NAME',
				'accounts'
			);
		}

		if (SettingsCapa('Sieve')) {
			settingsAddViewModel(FiltersUserSettings, 'SettingsFilters', 'SETTINGS_LABELS/LABEL_FILTERS_NAME', 'filters');
		}

		if (SettingsCapa('AutoLogout')) {
			settingsAddViewModel(SecurityUserSettings, 'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');
		}

		settingsAddViewModel(FoldersUserSettings, 'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');

		if (SettingsCapa('Themes')) {
			settingsAddViewModel(ThemesUserSettings, 'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');
		}

		if (SettingsCapa('OpenPGP') || SettingsCapa('GnuPG')) {
			settingsAddViewModel(OpenPgpUserSettings, 'SettingsOpenPGP', 'OpenPGP', 'openpgp');
		}

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
