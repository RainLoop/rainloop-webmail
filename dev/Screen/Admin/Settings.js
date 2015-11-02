
(function () {

	'use strict';

	var
		_ = require('_'),

		kn = require('Knoin/Knoin'),

		Plugins = require('Common/Plugins'),

		AbstractSettings = require('Screen/AbstractSettings')
	;

	/**
	 * @constructor
	 * @extends AbstractSettings
	 */
	function SettingsAdminScreen()
	{
		AbstractSettings.call(this, [
			require('View/Admin/Settings/Menu'),
			require('View/Admin/Settings/Pane')
		]);
	}

	_.extend(SettingsAdminScreen.prototype, AbstractSettings.prototype);

	/**
	 * @param {Function=} fCallback
	 */
	SettingsAdminScreen.prototype.setupSettings = function (fCallback)
	{
		kn.addSettingsViewModel(require('Settings/Admin/General'),
			'AdminSettingsGeneral', 'TABS_LABELS/LABEL_GENERAL_NAME', 'general', true);

		kn.addSettingsViewModel(require('Settings/Admin/Login'),
			'AdminSettingsLogin', 'TABS_LABELS/LABEL_LOGIN_NAME', 'login');

		if (RL_COMMUNITY)
		{
			kn.addSettingsViewModel(require('Settings/Admin/Branding'),
				'AdminSettingsBranding', 'TABS_LABELS/LABEL_BRANDING_NAME', 'branding');
		}
		else
		{
			kn.addSettingsViewModel(require('Settings/Admin/Prem/Branding'),
				'AdminSettingsBranding', 'TABS_LABELS/LABEL_BRANDING_NAME', 'branding');
		}

		kn.addSettingsViewModel(require('Settings/Admin/Contacts'),
			'AdminSettingsContacts', 'TABS_LABELS/LABEL_CONTACTS_NAME', 'contacts');

		kn.addSettingsViewModel(require('Settings/Admin/Domains'),
			'AdminSettingsDomains', 'TABS_LABELS/LABEL_DOMAINS_NAME', 'domains');

		kn.addSettingsViewModel(require('Settings/Admin/Security'),
			'AdminSettingsSecurity', 'TABS_LABELS/LABEL_SECURITY_NAME', 'security');

		kn.addSettingsViewModel(require('Settings/Admin/Social'),
			'AdminSettingsSocial', 'TABS_LABELS/LABEL_INTEGRATION_NAME', 'integrations');

		kn.addSettingsViewModel(require('Settings/Admin/Plugins'),
			'AdminSettingsPlugins', 'TABS_LABELS/LABEL_PLUGINS_NAME', 'plugins');

		kn.addSettingsViewModel(require('Settings/Admin/Packages'),
			'AdminSettingsPackages', 'TABS_LABELS/LABEL_PACKAGES_NAME', 'packages');

		if (!RL_COMMUNITY)
		{
			kn.addSettingsViewModel(require('Settings/Admin/Prem/Licensing'),
				'AdminSettingsLicensing', 'TABS_LABELS/LABEL_LICENSING_NAME', 'licensing');
		}

		kn.addSettingsViewModel(require('Settings/Admin/About'),
			'AdminSettingsAbout', 'TABS_LABELS/LABEL_ABOUT_NAME', 'about');

		Plugins.runSettingsViewModelHooks(true);

		if (fCallback)
		{
			fCallback();
		}
	};

	SettingsAdminScreen.prototype.onShow = function ()
	{
		require('App/Admin').setWindowTitle('');
	};

	module.exports = SettingsAdminScreen;

}());