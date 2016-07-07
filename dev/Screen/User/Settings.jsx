
import {Capa, KeyState} from 'Common/Enums';
import {keyScope, leftPanelType, leftPanelDisabled} from 'Common/Globals';
import {runSettingsViewModelHooks} from 'Common/Plugins';
import {initOnStartOrLangChange, i18n} from 'Common/Translator';

import AppStore from 'Stores/User/App';
import AccountStore from 'Stores/User/Account';

import * as Settings from 'Storage/Settings';
import {addSettingsViewModel} from 'Knoin/Knoin';

import {AbstractSettingsScreen} from 'Screen/AbstractSettings';
import App from 'App/User';

class SettingsUserScreen extends AbstractSettingsScreen
{
	constructor()
	{
		super([
			require('View/User/Settings/SystemDropDown'),
			require('View/User/Settings/Menu'),
			require('View/User/Settings/Pane')
		]);

		initOnStartOrLangChange(() => {
			this.sSettingsTitle = i18n('TITLES/SETTINGS');
		}, () => {
			this.setSettingsTitle();
		});
	}

	/**
	 * @param {Function=} fCallback
	 */
	setupSettings(fCallback = null) {
		if (!Settings.capa(Capa.Settings))
		{
			if (fCallback)
			{
				fCallback();
			}

			return false;
		}

		addSettingsViewModel(require('Settings/User/General'),
			'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

		if (AppStore.contactsIsAllowed())
		{
			addSettingsViewModel(require('Settings/User/Contacts'),
				'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');
		}

		if (Settings.capa(Capa.AdditionalAccounts) || Settings.capa(Capa.Identities))
		{
			addSettingsViewModel(require('Settings/User/Accounts'), 'SettingsAccounts',
				Settings.capa(Capa.AdditionalAccounts) ? 'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME' : 'SETTINGS_LABELS/LABEL_IDENTITIES_NAME', 'accounts');
		}

		if (Settings.capa(Capa.Sieve))
		{
			addSettingsViewModel(require('Settings/User/Filters'),
				'SettingsFilters', 'SETTINGS_LABELS/LABEL_FILTERS_NAME', 'filters');
		}

		if (Settings.capa(Capa.AutoLogout) || Settings.capa(Capa.TwoFactor))
		{
			addSettingsViewModel(require('Settings/User/Security'),
				'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');
		}

		if (AccountStore.isRootAccount() && (
			(Settings.settingsGet('AllowGoogleSocial') && Settings.settingsGet('AllowGoogleSocialAuth')) ||
			Settings.settingsGet('AllowFacebookSocial') ||
			Settings.settingsGet('AllowTwitterSocial')))
		{
			addSettingsViewModel(require('Settings/User/Social'),
				'SettingsSocial', 'SETTINGS_LABELS/LABEL_SOCIAL_NAME', 'social');
		}

		if (Settings.settingsGet('ChangePasswordIsAllowed'))
		{
			addSettingsViewModel(require('Settings/User/ChangePassword'),
				'SettingsChangePassword', 'SETTINGS_LABELS/LABEL_CHANGE_PASSWORD_NAME', 'change-password');
		}

		if (Settings.capa(Capa.Templates))
		{
			addSettingsViewModel(require('Settings/User/Templates'),
				'SettingsTemplates', 'SETTINGS_LABELS/LABEL_TEMPLATES_NAME', 'templates');
		}

		if (Settings.capa(Capa.Folders))
		{
			addSettingsViewModel(require('Settings/User/Folders'),
				'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');
		}

		if (Settings.capa(Capa.Themes))
		{
			addSettingsViewModel(require('Settings/User/Themes'),
				'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');
		}

		if (Settings.capa(Capa.OpenPGP))
		{
			addSettingsViewModel(require('Settings/User/OpenPgp'),
				'SettingsOpenPGP', 'SETTINGS_LABELS/LABEL_OPEN_PGP_NAME', 'openpgp');
		}

		runSettingsViewModelHooks(false);

		if (fCallback)
		{
			fCallback();
		}

		return true;
	}

	onShow() {
		this.setSettingsTitle();
		keyScope(KeyState.Settings);
		leftPanelType('');

		if (Settings.appSettingsGet('mobile'))
		{
			leftPanelDisabled(true);
		}
	}

	setSettingsTitle() {
		const sEmail = AccountStore.email();
		App.setWindowTitle(('' === sEmail ? '' : sEmail + ' - ') + this.sSettingsTitle);
	}
}

export {SettingsUserScreen, SettingsUserScreen as default};
