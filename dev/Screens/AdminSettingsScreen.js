
(function () {

	'use strict';

	var
		_ = require('_'),

		kn = require('App:Knoin'),

		AbstractSettings = require('Screen:AbstractSettings')
	;

	/**
	 * @constructor
	 * @extends AbstractSettings
	 */
	function AdminSettingsScreen()
	{
		AbstractSettings.call(this, [
			require('View:Admin:SettingsMenu'),
			require('View:Admin:SettingsPane')
		]);
	}

	_.extend(AdminSettingsScreen.prototype, AbstractSettings.prototype);

	/**
	 * @param {Function=} fCallback
	 */
	AdminSettingsScreen.prototype.setupSettings = function (fCallback)
	{
		kn.addSettingsViewModel(require('Settings:Admin:General'),
			'AdminSettingsGeneral', 'General', 'general', true);

		kn.addSettingsViewModel(require('Settings:Admin:Login'),
			'AdminSettingsLogin', 'Login', 'login');

		kn.addSettingsViewModel(require('Settings:Admin:Branding'),
			'AdminSettingsBranding', 'Branding', 'branding');

		kn.addSettingsViewModel(require('Settings:Admin:Contacts'),
			'AdminSettingsContacts', 'Contacts', 'contacts');

		kn.addSettingsViewModel(require('Settings:Admin:Domains'),
			'AdminSettingsDomains', 'Domains', 'domains');

		kn.addSettingsViewModel(require('Settings:Admin:Security'),
			'AdminSettingsSecurity', 'Security', 'security');

		kn.addSettingsViewModel(require('Settings:Admin:Social'),
			'AdminSettingsSocial', 'Social', 'social');

		kn.addSettingsViewModel(require('Settings:Admin:Plugins'),
			'AdminSettingsPlugins', 'Plugins', 'plugins');

		kn.addSettingsViewModel(require('Settings:Admin:Packages'),
			'AdminSettingsPackages', 'Packages', 'packages');

		kn.addSettingsViewModel(require('Settings:Admin:Licensing'),
			'AdminSettingsLicensing', 'Licensing', 'licensing');

		kn.addSettingsViewModel(require('Settings:Admin:About'),
			'AdminSettingsAbout', 'About', 'about');

		if (fCallback)
		{
			fCallback();
		}
	};

	AdminSettingsScreen.prototype.onShow = function ()
	{
		require('App:Admin').setTitle('');
	};

	module.exports = AdminSettingsScreen;

}());