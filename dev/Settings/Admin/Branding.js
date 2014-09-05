
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function BrandingAdminSetting()
	{
		var
			Enums = require('Common/Enums'),
			Settings = require('Storage/Settings')
		;

		this.title = ko.observable(Settings.settingsGet('Title'));
		this.title.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loadingDesc = ko.observable(Settings.settingsGet('LoadingDescription'));
		this.loadingDesc.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginLogo = ko.observable(Settings.settingsGet('LoginLogo'));
		this.loginLogo.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginDescription = ko.observable(Settings.settingsGet('LoginDescription'));
		this.loginDescription.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginCss = ko.observable(Settings.settingsGet('LoginCss'));
		this.loginCss.trigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	BrandingAdminSetting.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Storage/Admin/Remote')
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

	module.exports = BrandingAdminSetting;

}());