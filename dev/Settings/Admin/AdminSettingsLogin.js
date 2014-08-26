/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		AppSettings = require('../../Storages/AppSettings.js'),
		Data = require('../../Storages/AdminDataStorage.js')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsLogin()
	{
		this.determineUserLanguage = Data.determineUserLanguage;
		this.determineUserDomain = Data.determineUserDomain;

		this.defaultDomain = ko.observable(AppSettings.settingsGet('LoginDefaultDomain'));

		this.allowLanguagesOnLogin = Data.allowLanguagesOnLogin;
		this.defaultDomainTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	AdminSettingsLogin.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('../../Storages/AdminAjaxRemoteStorage.js')
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

	module.exports = AdminSettingsLogin;

}(module, require));