/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsBranding()
	{
		var
			Enums = require('Enums'),
			AppSettings = require('../../Storages/AppSettings.js')
		;

		this.title = ko.observable(AppSettings.settingsGet('Title'));
		this.title.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loadingDesc = ko.observable(AppSettings.settingsGet('LoadingDescription'));
		this.loadingDesc.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginLogo = ko.observable(AppSettings.settingsGet('LoginLogo'));
		this.loginLogo.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginDescription = ko.observable(AppSettings.settingsGet('LoginDescription'));
		this.loginDescription.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginCss = ko.observable(AppSettings.settingsGet('LoginCss'));
		this.loginCss.trigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	AdminSettingsBranding.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('../../Storages/AdminAjaxRemoteStorage.js')
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.title.trigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.loadingDesc.trigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.loginLogo.trigger, self),
				f4 = Utils.settingsSaveHelperSimpleFunction(self.loginDescription.trigger, self),
				f5 = Utils.settingsSaveHelperSimpleFunction(self.loginCss.trigger, self)
			;

			self.title.subscribe(function (sValue) {
				Remote.saveAdminConfig(f1, {
					'Title': Utils.trim(sValue)
				});
			});

			self.loadingDesc.subscribe(function (sValue) {
				Remote.saveAdminConfig(f2, {
					'LoadingDescription': Utils.trim(sValue)
				});
			});

			self.loginLogo.subscribe(function (sValue) {
				Remote.saveAdminConfig(f3, {
					'LoginLogo': Utils.trim(sValue)
				});
			});

			self.loginDescription.subscribe(function (sValue) {
				Remote.saveAdminConfig(f4, {
					'LoginDescription': Utils.trim(sValue)
				});
			});

			self.loginCss.subscribe(function (sValue) {
				Remote.saveAdminConfig(f5, {
					'LoginCss': Utils.trim(sValue)
				});
			});

		}, 50);
	};

	module.exports = AdminSettingsBranding;

}(module, require));