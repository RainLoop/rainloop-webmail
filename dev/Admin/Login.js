/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminLogin()
{
	var oData = RL.data();
	
	this.determineUserLanguage = oData.determineUserLanguage;
	this.determineUserDomain = oData.determineUserDomain;
	
	this.defaultDomain = ko.observable(RL.settingsGet('LoginDefaultDomain'));

	this.allowLanguagesOnLogin = oData.allowLanguagesOnLogin;
	this.defaultDomainTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminLogin, 'AdminSettingsLogin', 'Login', 'login');

AdminLogin.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var f1 = Utils.settingsSaveHelperSimpleFunction(self.defaultDomainTrigger, self);

		self.determineUserLanguage.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'DetermineUserLanguage': bValue ? '1' : '0'
			});
		});

		self.determineUserDomain.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'DetermineUserDomain': bValue ? '1' : '0'
			});
		});
		
		self.allowLanguagesOnLogin.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowLanguagesOnLogin': bValue ? '1' : '0'
			});
		});

		self.defaultDomain.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f1, {
				'LoginDefaultDomain': Utils.trim(sValue)
			});
		});

	}, 50);
};
