
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function SocialAdminSettings()
	{
		var Data = require('Storage/Admin/Data');

		this.googleEnable = Data.googleEnable;
		this.googleClientID = Data.googleClientID;
		this.googleApiKey = Data.googleApiKey;
		this.googleClientSecret = Data.googleClientSecret;

		this.googleTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
		this.googleTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);
		this.googleTrigger3 = ko.observable(Enums.SaveSettingsStep.Idle);

		this.facebookSupported = Data.facebookSupported;
		this.facebookEnable = Data.facebookEnable;
		this.facebookAppID = Data.facebookAppID;
		this.facebookAppSecret = Data.facebookAppSecret;
		this.facebookTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
		this.facebookTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

		this.twitterEnable = Data.twitterEnable;
		this.twitterConsumerKey = Data.twitterConsumerKey;
		this.twitterConsumerSecret = Data.twitterConsumerSecret;
		this.twitterTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
		this.twitterTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

		this.dropboxEnable = Data.dropboxEnable;
		this.dropboxApiKey = Data.dropboxApiKey;
		this.dropboxTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	SocialAdminSettings.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Storage/Admin/Remote')
		;

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
					Remote.saveAdminConfig(Utils.emptyFunction, {
						'FacebookEnable': bValue ? '1' : '0'
					});
				}
			});

			self.facebookAppID.subscribe(function (sValue) {
				if (self.facebookSupported())
				{
					Remote.saveAdminConfig(f1, {
						'FacebookAppID': Utils.trim(sValue)
					});
				}
			});

			self.facebookAppSecret.subscribe(function (sValue) {
				if (self.facebookSupported())
				{
					Remote.saveAdminConfig(f2, {
						'FacebookAppSecret': Utils.trim(sValue)
					});
				}
			});

			self.twitterEnable.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'TwitterEnable': bValue ? '1' : '0'
				});
			});

			self.twitterConsumerKey.subscribe(function (sValue) {
				Remote.saveAdminConfig(f3, {
					'TwitterConsumerKey': Utils.trim(sValue)
				});
			});

			self.twitterConsumerSecret.subscribe(function (sValue) {
				Remote.saveAdminConfig(f4, {
					'TwitterConsumerSecret': Utils.trim(sValue)
				});
			});

			self.googleEnable.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'GoogleEnable': bValue ? '1' : '0'
				});
			});

			self.googleEnable.auth.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'GoogleEnableAuth': bValue ? '1' : '0'
				});
			});

			self.googleEnable.drive.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'GoogleEnableDrive': bValue ? '1' : '0'
				});
			});

			self.googleClientID.subscribe(function (sValue) {
				Remote.saveAdminConfig(f5, {
					'GoogleClientID': Utils.trim(sValue)
				});
			});

			self.googleClientSecret.subscribe(function (sValue) {
				Remote.saveAdminConfig(f6, {
					'GoogleClientSecret': Utils.trim(sValue)
				});
			});

			self.googleApiKey.subscribe(function (sValue) {
				Remote.saveAdminConfig(f7, {
					'GoogleApiKey': Utils.trim(sValue)
				});
			});

			self.dropboxEnable.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'DropboxEnable': bValue ? '1' : '0'
				});
			});

			self.dropboxApiKey.subscribe(function (sValue) {
				Remote.saveAdminConfig(f8, {
					'DropboxApiKey': Utils.trim(sValue)
				});
			});

		}, 50);
	};

	module.exports = SocialAdminSettings;

}());