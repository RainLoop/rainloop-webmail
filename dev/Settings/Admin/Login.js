
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		AppAdminStore = require('Stores/Admin/App'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function LoginAdminSettings()
	{
		this.determineUserLanguage = AppAdminStore.determineUserLanguage;
		this.determineUserDomain = AppAdminStore.determineUserDomain;

		this.defaultDomain = ko.observable(Settings.settingsGet('LoginDefaultDomain'));

		this.allowLanguagesOnLogin = AppAdminStore.allowLanguagesOnLogin;
		this.defaultDomainTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.dummy = ko.observable(false);
	}

	LoginAdminSettings.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Remote/Admin/Ajax')
		;

		_.delay(function () {

			var f1 = Utils.settingsSaveHelperSimpleFunction(self.defaultDomainTrigger, self);

			self.determineUserLanguage.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'DetermineUserLanguage': bValue ? '1' : '0'
				});
			});

			self.determineUserDomain.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'DetermineUserDomain': bValue ? '1' : '0'
				});
			});

			self.allowLanguagesOnLogin.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnLogin': bValue ? '1' : '0'
				});
			});

			self.defaultDomain.subscribe(function (sValue) {
				Remote.saveAdminConfig(f1, {
					'LoginDefaultDomain': Utils.trim(sValue)
				});
			});

		}, 50);
	};

	module.exports = LoginAdminSettings;

}());