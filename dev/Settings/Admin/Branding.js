
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

		this.userLogoMessage = ko.observable(Settings.settingsGet('UserLogoMessage') || '');
		this.userLogoMessage.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.userIframeMessage = ko.observable(Settings.settingsGet('UserIframeMessage') || '');
		this.userIframeMessage.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.userLogoTitle = ko.observable(Settings.settingsGet('UserLogoTitle') || '');
		this.userLogoTitle.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

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

		this.community = RL_COMMUNITY || AppStore.community();
	}

	BrandingAdminSettings.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Remote/Admin/Ajax')
		;

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