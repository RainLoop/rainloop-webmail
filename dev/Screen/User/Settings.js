
(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Translator = require('Common/Translator'),

		Plugins = require('Common/Plugins'),

		AppStore = require('Stores/User/App'),
		AccountStore = require('Stores/User/Account'),
		Settings = require('Storage/Settings'),

		kn = require('Knoin/Knoin'),

		AbstractSettingsScreen = require('Screen/AbstractSettings')
	;

	/**
	 * @constructor
	 * @extends AbstractSettingsScreen
	 */
	function SettingsUserScreen()
	{
		AbstractSettingsScreen.call(this, [
			require('View/User/Settings/SystemDropDown'),
			require('View/User/Settings/Menu'),
			require('View/User/Settings/Pane')
		]);

		Translator.initOnStartOrLangChange(function () {
			this.sSettingsTitle = Translator.i18n('TITLES/SETTINGS');
		}, this, function () {
			this.setSettingsTitle();
		});
	}

	_.extend(SettingsUserScreen.prototype, AbstractSettingsScreen.prototype);

	/**
	 * @param {Function=} fCallback
	 */
	SettingsUserScreen.prototype.setupSettings = function (fCallback)
	{
		if (!Settings.capa(Enums.Capa.Settings))
		{
			if (fCallback)
			{
				fCallback();
			}

			return false;
		}

		kn.addSettingsViewModel(require('Settings/User/General'),
			'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

		if (AppStore.contactsIsAllowed())
		{
			kn.addSettingsViewModel(require('Settings/User/Contacts'),
				'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');
		}

		if (Settings.capa(Enums.Capa.AdditionalAccounts) || Settings.capa(Enums.Capa.Identities))
		{
			kn.addSettingsViewModel(require('Settings/User/Accounts'), 'SettingsAccounts',
				Settings.capa(Enums.Capa.AdditionalAccounts) ?
					'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME' : 'SETTINGS_LABELS/LABEL_IDENTITIES_NAME', 'accounts');
		}

		if (Settings.capa(Enums.Capa.Sieve))
		{
			kn.addSettingsViewModel(require('Settings/User/Filters'),
				'SettingsFilters', 'SETTINGS_LABELS/LABEL_FILTERS_NAME', 'filters');
		}

		if (Settings.capa(Enums.Capa.AutoLogout) || Settings.capa(Enums.Capa.TwoFactor))
		{
			kn.addSettingsViewModel(require('Settings/User/Security'),
				'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');
		}

		if (AccountStore.isRootAccount() && (
			(Settings.settingsGet('AllowGoogleSocial') && Settings.settingsGet('AllowGoogleSocialAuth')) ||
			Settings.settingsGet('AllowFacebookSocial') ||
			Settings.settingsGet('AllowTwitterSocial')))
		{
			kn.addSettingsViewModel(require('Settings/User/Social'),
				'SettingsSocial', 'SETTINGS_LABELS/LABEL_SOCIAL_NAME', 'social');
		}

		if (Settings.settingsGet('ChangePasswordIsAllowed'))
		{
			kn.addSettingsViewModel(require('Settings/User/ChangePassword'),
				'SettingsChangePassword', 'SETTINGS_LABELS/LABEL_CHANGE_PASSWORD_NAME', 'change-password');
		}

		if (Settings.capa(Enums.Capa.Templates))
		{
			kn.addSettingsViewModel(require('Settings/User/Templates'),
				'SettingsTemplates', 'SETTINGS_LABELS/LABEL_TEMPLATES_NAME', 'templates');
		}

		if (Settings.capa(Enums.Capa.Folders))
		{
			kn.addSettingsViewModel(require('Settings/User/Folders'),
				'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');
		}

		if (Settings.capa(Enums.Capa.Themes))
		{
			kn.addSettingsViewModel(require('Settings/User/Themes'),
				'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');
		}

		if (Settings.capa(Enums.Capa.OpenPGP))
		{
			kn.addSettingsViewModel(require('Settings/User/OpenPgp'),
				'SettingsOpenPGP', 'SETTINGS_LABELS/LABEL_OPEN_PGP_NAME', 'openpgp');
		}

		Plugins.runSettingsViewModelHooks(false);

		if (fCallback)
		{
			fCallback();
		}

		return true;
	};

	SettingsUserScreen.prototype.onShow = function ()
	{
		this.setSettingsTitle();
		Globals.keyScope(Enums.KeyState.Settings);
		Globals.leftPanelType('');
	};

	SettingsUserScreen.prototype.setSettingsTitle = function ()
	{
		var sEmail = AccountStore.email();
		require('App/User').setWindowTitle(('' === sEmail ? '' : sEmail + ' - ') + this.sSettingsTitle);
	};

	module.exports = SettingsUserScreen;

}());