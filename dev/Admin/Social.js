/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminSocial()
{
	var oData = RL.data();

	this.googleEnable = oData.googleEnable;
	this.googleClientID = oData.googleClientID;
	this.googleClientSecret = oData.googleClientSecret;
	this.googleApiKey = oData.googleApiKey;
	this.googleTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
	this.googleTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);
	this.googleTrigger3 = ko.observable(Enums.SaveSettingsStep.Idle);

	this.facebookSupported = oData.facebookSupported;
	this.facebookEnable = oData.facebookEnable;
	this.facebookAppID = oData.facebookAppID;
	this.facebookAppSecret = oData.facebookAppSecret;
	this.facebookTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
	this.facebookTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

	this.twitterEnable = oData.twitterEnable;
	this.twitterConsumerKey = oData.twitterConsumerKey;
	this.twitterConsumerSecret = oData.twitterConsumerSecret;
	this.twitterTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
	this.twitterTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

	this.dropboxEnable = oData.dropboxEnable;
	this.dropboxApiKey = oData.dropboxApiKey;
	this.dropboxTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminSocial, 'AdminSettingsSocial', 'Social', 'social');

AdminSocial.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f1 = Utils.settingsSaveHelperSimpleFunction(self.facebookTrigger1, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.facebookTrigger2, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.twitterTrigger1, self),
			f4 = Utils.settingsSaveHelperSimpleFunction(self.twitterTrigger2, self),
			f5 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger1, self),
			f6 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger2, self),
			f7 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger3, self),
			f8 = Utils.settingsSaveHelperSimpleFunction(self.dropboxTrigger1, self)
		;

		self.facebookEnable.subscribe(function (bValue) {
			if (self.facebookSupported())
			{
				RL.remote().saveAdminConfig(Utils.emptyFunction, {
					'FacebookEnable': bValue ? '1' : '0'
				});
			}
		});

		self.facebookAppID.subscribe(function (sValue) {
			if (self.facebookSupported())
			{
				RL.remote().saveAdminConfig(f1, {
					'FacebookAppID': Utils.trim(sValue)
				});
			}
		});

		self.facebookAppSecret.subscribe(function (sValue) {
			if (self.facebookSupported())
			{
				RL.remote().saveAdminConfig(f2, {
					'FacebookAppSecret': Utils.trim(sValue)
				});
			}
		});

		self.twitterEnable.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(Utils.emptyFunction, {
				'TwitterEnable': bValue ? '1' : '0'
			});
		});

		self.twitterConsumerKey.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f3, {
				'TwitterConsumerKey': Utils.trim(sValue)
			});
		});

		self.twitterConsumerSecret.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f4, {
				'TwitterConsumerSecret': Utils.trim(sValue)
			});
		});

		self.googleEnable.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(Utils.emptyFunction, {
				'GoogleEnable': bValue ? '1' : '0'
			});
		});

		self.googleClientID.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f5, {
				'GoogleClientID': Utils.trim(sValue)
			});
		});

		self.googleClientSecret.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f6, {
				'GoogleClientSecret': Utils.trim(sValue)
			});
		});

		self.googleApiKey.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f7, {
				'GoogleApiKey': Utils.trim(sValue)
			});
		});

		self.dropboxEnable.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(Utils.emptyFunction, {
				'DropboxEnable': bValue ? '1' : '0'
			});
		});

		self.dropboxApiKey.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f8, {
				'DropboxApiKey': Utils.trim(sValue)
			});
		});

	}, 50);
};
