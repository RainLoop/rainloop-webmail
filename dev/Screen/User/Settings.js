import { Capa, KeyState } from 'Common/Enums';
import { keyScope, leftPanelType, leftPanelDisabled } from 'Common/Globals';
import { runSettingsViewModelHooks } from 'Common/Plugins';
import { initOnStartOrLangChange, i18n } from 'Common/Translator';

import AppStore from 'Stores/User/App';
import AccountStore from 'Stores/User/Account';

import * as Settings from 'Storage/Settings';
import { addSettingsViewModel } from 'Knoin/Knoin';

import { AbstractSettingsScreen } from 'Screen/AbstractSettings';

import { GeneralUserSettings } from 'Settings/User/General';
import { ContactsUserSettings } from 'Settings/User/Contacts';
import { AccountsUserSettings } from 'Settings/User/Accounts';
import { FiltersUserSettings } from 'Settings/User/Filters';
import { SecurityUserSettings } from 'Settings/User/Security';
import { SocialUserSettings } from 'Settings/User/Social';
import { ChangePasswordUserSettings } from 'Settings/User/ChangePassword';
import { TemplatesUserSettings } from 'Settings/User/Templates';
import { FoldersUserSettings } from 'Settings/User/Folders';
import { ThemesUserSettings } from 'Settings/User/Themes';
import { OpenPgpUserSettings } from 'Settings/User/OpenPgp';

import { SystemDropDownSettingsUserView } from 'View/User/Settings/SystemDropDown';
import { MenuSettingsUserView } from 'View/User/Settings/Menu';
import { PaneSettingsUserView } from 'View/User/Settings/Pane';

import { getApp } from 'Helper/Apps/User';

class SettingsUserScreen extends AbstractSettingsScreen {
	constructor() {
		super([SystemDropDownSettingsUserView, MenuSettingsUserView, PaneSettingsUserView]);

		initOnStartOrLangChange(
			() => {
				this.sSettingsTitle = i18n('TITLES/SETTINGS');
			},
			() => {
				this.setSettingsTitle();
			}
		);
	}

	/**
	 * @param {Function=} fCallback
	 */
	setupSettings(fCallback = null) {
		if (!Settings.capa(Capa.Settings)) {
			if (fCallback) {
				fCallback();
			}

			return false;
		}

		addSettingsViewModel(GeneralUserSettings, 'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

		if (AppStore.contactsIsAllowed()) {
			addSettingsViewModel(ContactsUserSettings, 'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');
		}

		if (Settings.capa(Capa.AdditionalAccounts) || Settings.capa(Capa.Identities)) {
			addSettingsViewModel(
				AccountsUserSettings,
				'SettingsAccounts',
				Settings.capa(Capa.AdditionalAccounts)
					? 'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME'
					: 'SETTINGS_LABELS/LABEL_IDENTITIES_NAME',
				'accounts'
			);
		}

		if (Settings.capa(Capa.Sieve)) {
			addSettingsViewModel(FiltersUserSettings, 'SettingsFilters', 'SETTINGS_LABELS/LABEL_FILTERS_NAME', 'filters');
		}

		if (Settings.capa(Capa.AutoLogout) || Settings.capa(Capa.TwoFactor)) {
			addSettingsViewModel(SecurityUserSettings, 'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');
		}

		if (
			AccountStore.isRootAccount() &&
			((Settings.settingsGet('AllowGoogleSocial') && Settings.settingsGet('AllowGoogleSocialAuth')) ||
				Settings.settingsGet('AllowFacebookSocial') ||
				Settings.settingsGet('AllowTwitterSocial'))
		) {
			addSettingsViewModel(SocialUserSettings, 'SettingsSocial', 'SETTINGS_LABELS/LABEL_SOCIAL_NAME', 'social');
		}

		if (Settings.settingsGet('ChangePasswordIsAllowed')) {
			addSettingsViewModel(
				ChangePasswordUserSettings,
				'SettingsChangePassword',
				'SETTINGS_LABELS/LABEL_CHANGE_PASSWORD_NAME',
				'change-password'
			);
		}

		if (Settings.capa(Capa.Templates)) {
			addSettingsViewModel(
				TemplatesUserSettings,
				'SettingsTemplates',
				'SETTINGS_LABELS/LABEL_TEMPLATES_NAME',
				'templates'
			);
		}

		if (Settings.capa(Capa.Folders)) {
			addSettingsViewModel(FoldersUserSettings, 'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');
		}

		if (Settings.capa(Capa.Themes)) {
			addSettingsViewModel(ThemesUserSettings, 'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');
		}

		if (Settings.capa(Capa.OpenPGP)) {
			addSettingsViewModel(OpenPgpUserSettings, 'SettingsOpenPGP', 'SETTINGS_LABELS/LABEL_OPEN_PGP_NAME', 'openpgp');
		}

		runSettingsViewModelHooks(false);

		if (fCallback) {
			fCallback();
		}

		return true;
	}

	onShow() {
		this.setSettingsTitle();
		keyScope(KeyState.Settings);
		leftPanelType('');

		if (Settings.appSettingsGet('mobile')) {
			leftPanelDisabled(true);
		}
	}

	setSettingsTitle() {
		const sEmail = AccountStore.email();
		getApp().setWindowTitle(('' === sEmail ? '' : sEmail + ' - ') + this.sSettingsTitle);
	}
}

export { SettingsUserScreen, SettingsUserScreen as default };
