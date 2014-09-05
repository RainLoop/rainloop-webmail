
(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Globals = require('Common/Globals'),

		Settings = require('Storage/Settings'),

		kn = require('Knoin/Knoin'),

		AbstractSettingsScreen = require('Screen/AbstractSettings')
	;

	/**
	 * @constructor
	 * @extends AbstractSettingsScreen
	 */
	function SettingsAppScreen()
	{
		AbstractSettingsScreen.call(this, [
			require('View/App/Settings/SystemDropDown'),
			require('View/App/Settings/Menu'),
			require('View/App/Settings/Pane')
		]);

		Utils.initOnStartOrLangChange(function () {
			this.sSettingsTitle = Utils.i18n('TITLES/SETTINGS');
		}, this, function () {
			this.setSettingsTitle();
		});
	}

	_.extend(SettingsAppScreen.prototype, AbstractSettingsScreen.prototype);

	/**
	 * @param {Function=} fCallback
	 */
	SettingsAppScreen.prototype.setupSettings = function (fCallback)
	{
		kn.addSettingsViewModel(require('Settings/App/General'),
			'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

		if (Settings.settingsGet('ContactsIsAllowed'))
		{
			kn.addSettingsViewModel(require('Settings/App/Contacts'),
				'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');
		}

		if (Settings.capa(Enums.Capa.AdditionalAccounts))
		{
			kn.addSettingsViewModel(require('Settings/App/Accounts'),
				'SettingsAccounts', 'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME', 'accounts');
		}

		if (Settings.capa(Enums.Capa.AdditionalIdentities))
		{
			kn.addSettingsViewModel(require('Settings/App/Identities'),
				'SettingsIdentities', 'SETTINGS_LABELS/LABEL_IDENTITIES_NAME', 'identities');
		}
		else
		{
			kn.addSettingsViewModel(require('Settings/App/Identity'),
				'SettingsIdentity', 'SETTINGS_LABELS/LABEL_IDENTITY_NAME', 'identity');
		}

		if (Settings.capa(Enums.Capa.Filters))
		{
			kn.addSettingsViewModel(require('Settings/App/Filters'),
				'SettingsFilters', 'SETTINGS_LABELS/LABEL_FILTERS_NAME', 'filters');
		}

		if (Settings.capa(Enums.Capa.TwoFactor))
		{
			kn.addSettingsViewModel(require('Settings/App/Security'),
				'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');
		}

		if (Settings.settingsGet('AllowGoogleSocial') ||
			Settings.settingsGet('AllowFacebookSocial') ||
			Settings.settingsGet('AllowTwitterSocial'))
		{
			kn.addSettingsViewModel(require('Settings/App/Social'),
				'SettingsSocial', 'SETTINGS_LABELS/LABEL_SOCIAL_NAME', 'social');
		}

		if (Settings.settingsGet('ChangePasswordIsAllowed'))
		{
			kn.addSettingsViewModel(require('Settings/App/ChangePassword'),
				'SettingsChangePassword', 'SETTINGS_LABELS/LABEL_CHANGE_PASSWORD_NAME', 'change-password');
		}

		kn.addSettingsViewModel(require('Settings/App/Folders'),
			'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');

		if (Settings.capa(Enums.Capa.Themes))
		{
			kn.addSettingsViewModel(require('Settings/App/Themes'),
				'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');
		}

		if (Settings.capa(Enums.Capa.OpenPGP))
		{
			kn.addSettingsViewModel(require('Settings/App/OpenPGP'),
				'SettingsOpenPGP', 'SETTINGS_LABELS/LABEL_OPEN_PGP_NAME', 'openpgp');
		}

		if (fCallback)
		{
			fCallback();
		}
	};

	SettingsAppScreen.prototype.onShow = function ()
	{
		this.setSettingsTitle();
		Globals.keyScope(Enums.KeyState.Settings);
	};

	SettingsAppScreen.prototype.setSettingsTitle = function ()
	{
		require('App/App').setTitle(this.sSettingsTitle);
	};

	module.exports = SettingsAppScreen;

}());