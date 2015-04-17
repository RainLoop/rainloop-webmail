
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),
		Translator = require('Common/Translator')
	;

	/**
	 * @constructor
	 */
	function BrandingAdminSettings()
	{
		var
			Enums = require('Common/Enums'),
			Settings = require('Storage/Settings'),
			AppStore = require('Stores/Admin/App')
		;

		this.capa = AppStore.prem;

		this.title = ko.observable(Settings.settingsGet('Title'));
		this.title.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loadingDesc = ko.observable(Settings.settingsGet('LoadingDescription'));
		this.loadingDesc.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginLogo = ko.observable(Settings.settingsGet('LoginLogo') || '');
		this.loginLogo.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginBackground = ko.observable(Settings.settingsGet('LoginBackground') || '');
		this.loginBackground.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.userLogo = ko.observable(Settings.settingsGet('UserLogo') || '');
		this.userLogo.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginDescription = ko.observable(Settings.settingsGet('LoginDescription'));
		this.loginDescription.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginCss = ko.observable(Settings.settingsGet('LoginCss'));
		this.loginCss.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.userCss = ko.observable(Settings.settingsGet('UserCss'));
		this.userCss.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.welcomePageUrl = ko.observable(Settings.settingsGet('WelcomePageUrl'));
		this.welcomePageUrl.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.welcomePageDisplay = ko.observable(Settings.settingsGet('WelcomePageDisplay'));
		this.welcomePageDisplay.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.welcomePageDisplay.options = ko.computed(function () {
			Translator.trigger();
			return [
				{'optValue': 'none', 'optText': Translator.i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_NONE')},
				{'optValue': 'once', 'optText': Translator.i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_ONCE')},
				{'optValue': 'always', 'optText': Translator.i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_ALWAYS')}
			];
		});

		this.loginPowered = ko.observable(!!Settings.settingsGet('LoginPowered'));
	}

	BrandingAdminSettings.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Remote/Admin/Ajax')
		;

		if (this.capa())
		{
			_.delay(function () {

				var
					f3 = Utils.settingsSaveHelperSimpleFunction(self.loginLogo.trigger, self),
					f4 = Utils.settingsSaveHelperSimpleFunction(self.loginDescription.trigger, self),
					f5 = Utils.settingsSaveHelperSimpleFunction(self.loginCss.trigger, self),
					f6 = Utils.settingsSaveHelperSimpleFunction(self.userLogo.trigger, self),
					f7 = Utils.settingsSaveHelperSimpleFunction(self.loginBackground.trigger, self),
					f8 = Utils.settingsSaveHelperSimpleFunction(self.userCss.trigger, self),
					f9 = Utils.settingsSaveHelperSimpleFunction(self.welcomePageUrl.trigger, self),
					f10 = Utils.settingsSaveHelperSimpleFunction(self.welcomePageDisplay.trigger, self)
				;

				self.loginLogo.subscribe(function (sValue) {
					Remote.saveAdminConfig(f3, {
						'LoginLogo': Utils.trim(sValue)
					});
				});

				self.loginBackground.subscribe(function (sValue) {
					Remote.saveAdminConfig(f7, {
						'LoginBackground': Utils.trim(sValue)
					});
				});

				self.userLogo.subscribe(function (sValue) {
					Remote.saveAdminConfig(f6, {
						'UserLogo': Utils.trim(sValue)
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

				self.userCss.subscribe(function (sValue) {
					Remote.saveAdminConfig(f8, {
						'UserCss': Utils.trim(sValue)
					});
				});

				self.welcomePageUrl.subscribe(function (sValue) {
					Remote.saveAdminConfig(f9, {
						'WelcomePageUrl': Utils.trim(sValue)
					});
				});

				self.welcomePageDisplay.subscribe(function (sValue) {
					Remote.saveAdminConfig(f10, {
						'WelcomePageDisplay': Utils.trim(sValue)
					});
				});

				self.loginPowered.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'LoginPowered': bValue ? '1' : '0'
					});
				});

			}, 50);
		}

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.title.trigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.loadingDesc.trigger, self)
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

		}, 50);
	};

	module.exports = BrandingAdminSettings;

}());