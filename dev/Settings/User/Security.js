
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		SettinsStore = require('Stores/User/Settings'),

		Settings = require('Storage/Settings'),

		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function SecurityUserSettings()
	{
		this.capaAutoLogout = Settings.capa(Enums.Capa.AutoLogout);
		this.capaTwoFactor = Settings.capa(Enums.Capa.TwoFactor);

		this.autoLogout = SettinsStore.autoLogout;
		this.autoLogout.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.autoLogoutOptions = ko.computed(function () {
			Translator.trigger();
			return [
				{'id': 0, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_NEVER_OPTION_NAME')},
				{'id': 5, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', {'MINUTES': 5})},
				{'id': 10, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', {'MINUTES': 10})},
				{'id': 30, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', {'MINUTES': 30})},
				{'id': 60, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', {'MINUTES': 60})}
			];
		});
	}

	SecurityUserSettings.prototype.configureTwoFactor = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/TwoFactorConfiguration'));
	};

	SecurityUserSettings.prototype.onBuild = function ()
	{
		if (this.capaAutoLogout)
		{
			var self = this;

			_.delay(function () {

				var
					f0 = Utils.settingsSaveHelperSimpleFunction(self.autoLogout.trigger, self)
				;

				self.autoLogout.subscribe(function (sValue) {
					Remote.saveSettings(f0, {
						'AutoLogout': Utils.pInt(sValue)
					});
				});

			});
		}
	};

	module.exports = SecurityUserSettings;

}());