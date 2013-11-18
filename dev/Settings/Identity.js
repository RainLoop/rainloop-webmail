/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsIdentity()
{
	var oData = RL.data();
	
	this.displayName = oData.displayName;
	this.signature = oData.signature;
	this.replyTo = oData.replyTo;

	this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(SettingsIdentity, 'SettingsIdentity', 'SETTINGS_LABELS/LABEL_IDENTITY_NAME', 'identity');

SettingsIdentity.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var 
			oData = RL.data(),
			f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self)
		;

		oData.displayName.subscribe(function (sValue) {
			RL.remote().saveSettings(f1, {
				'DisplayName': sValue
			});
		});

		oData.replyTo.subscribe(function (sValue) {
			RL.remote().saveSettings(f2, {
				'ReplyTo': sValue
			});
		});

		oData.signature.subscribe(function (sValue) {
			RL.remote().saveSettings(f3, {
				'Signature': sValue
			});
		});
		
	}, 50);
};
