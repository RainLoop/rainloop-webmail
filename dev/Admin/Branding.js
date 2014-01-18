/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminBranding()
{
	this.title = ko.observable(RL.settingsGet('Title'));
	this.title.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.loadingDesc = ko.observable(RL.settingsGet('LoadingDescription'));
	this.loadingDesc.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.loginLogo = ko.observable(RL.settingsGet('LoginLogo'));
	this.loginLogo.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.loginDescription = ko.observable(RL.settingsGet('LoginDescription'));
	this.loginDescription.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.loginCss = ko.observable(RL.settingsGet('LoginCss'));
	this.loginCss.trigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminBranding, 'AdminSettingsBranding', 'Branding', 'branding');

AdminBranding.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f1 = Utils.settingsSaveHelperSimpleFunction(self.title.trigger, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.loadingDesc.trigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.loginLogo.trigger, self),
			f4 = Utils.settingsSaveHelperSimpleFunction(self.loginDescription.trigger, self),
			f5 = Utils.settingsSaveHelperSimpleFunction(self.loginCss.trigger, self)
		;

		self.title.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f1, {
				'Title': Utils.trim(sValue)
			});
		});

		self.loadingDesc.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f2, {
				'LoadingDescription': Utils.trim(sValue)
			});
		});

		self.loginLogo.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f3, {
				'LoginLogo': Utils.trim(sValue)
			});
		});

		self.loginDescription.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f4, {
				'LoginDescription': Utils.trim(sValue)
			});
		});

		self.loginCss.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f5, {
				'LoginCss': Utils.trim(sValue)
			});
		});

	}, 50);
};
