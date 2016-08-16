
/* global RL_COMMUNITY */

import {addSettingsViewModel} from 'Knoin/Knoin';
import {runSettingsViewModelHooks} from 'Common/Plugins';

import {AbstractSettingsScreen} from 'Screen/AbstractSettings';

import {GeneralAdminSettings} from 'Settings/Admin/General';
import {LoginAdminSettings} from 'Settings/Admin/Login';
import {ContactsAdminSettings} from 'Settings/Admin/Contacts';
import {DomainsAdminSettings} from 'Settings/Admin/Domains';
import {SecurityAdminSettings} from 'Settings/Admin/Security';
import {SocialAdminSettings} from 'Settings/Admin/Social';
import {PluginsAdminSettings} from 'Settings/Admin/Plugins';
import {PackagesAdminSettings} from 'Settings/Admin/Packages';
import {AboutAdminSettings} from 'Settings/Admin/About';

import {getApp} from 'Helper/Apps/Admin';

import {MenuSettingsAdminView} from 'View/Admin/Settings/Menu';
import {PaneSettingsAdminView} from 'View/Admin/Settings/Pane';

class SettingsAdminScreen extends AbstractSettingsScreen
{
	constructor() {
		super([
			MenuSettingsAdminView,
			PaneSettingsAdminView
		]);
	}

	/**
	 * @param {Function=} fCallback = null
	 */
	setupSettings(fCallback = null) {
		addSettingsViewModel(GeneralAdminSettings,
			'AdminSettingsGeneral', 'TABS_LABELS/LABEL_GENERAL_NAME', 'general', true);

		addSettingsViewModel(LoginAdminSettings,
			'AdminSettingsLogin', 'TABS_LABELS/LABEL_LOGIN_NAME', 'login');

		if (RL_COMMUNITY)
		{
			addSettingsViewModel(require('Settings/Admin/Branding').default,
				'AdminSettingsBranding', 'TABS_LABELS/LABEL_BRANDING_NAME', 'branding');
		}
		else
		{
			addSettingsViewModel(require('Settings/Admin/Prem/Branding').default,
				'AdminSettingsBranding', 'TABS_LABELS/LABEL_BRANDING_NAME', 'branding');
		}

		addSettingsViewModel(ContactsAdminSettings,
			'AdminSettingsContacts', 'TABS_LABELS/LABEL_CONTACTS_NAME', 'contacts');

		addSettingsViewModel(DomainsAdminSettings,
			'AdminSettingsDomains', 'TABS_LABELS/LABEL_DOMAINS_NAME', 'domains');

		addSettingsViewModel(SecurityAdminSettings,
			'AdminSettingsSecurity', 'TABS_LABELS/LABEL_SECURITY_NAME', 'security');

		addSettingsViewModel(SocialAdminSettings,
			'AdminSettingsSocial', 'TABS_LABELS/LABEL_INTEGRATION_NAME', 'integrations');

		addSettingsViewModel(PluginsAdminSettings,
			'AdminSettingsPlugins', 'TABS_LABELS/LABEL_PLUGINS_NAME', 'plugins');

		addSettingsViewModel(PackagesAdminSettings,
			'AdminSettingsPackages', 'TABS_LABELS/LABEL_PACKAGES_NAME', 'packages');

		if (!RL_COMMUNITY)
		{
			addSettingsViewModel(require('Settings/Admin/Prem/Licensing').default,
				'AdminSettingsLicensing', 'TABS_LABELS/LABEL_LICENSING_NAME', 'licensing');
		}

		addSettingsViewModel(AboutAdminSettings,
			'AdminSettingsAbout', 'TABS_LABELS/LABEL_ABOUT_NAME', 'about');

		runSettingsViewModelHooks(true);

		if (fCallback)
		{
			fCallback();
		}
	}

	onShow() {
		getApp().setWindowTitle('');
	}
}

export {SettingsAdminScreen, SettingsAdminScreen as default};
