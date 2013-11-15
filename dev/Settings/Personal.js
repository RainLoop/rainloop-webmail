/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsPersonal()
{
	var oData = RL.data();
	
	this.displayName = oData.displayName;
	this.replyTo = oData.replyTo;
	this.signature = oData.signature;

	this.nameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(SettingsPersonal, 'SettingsPersonal', 'SETTINGS_LABELS/LABEL_PERSONAL_NAME', 'personal');

SettingsPersonal.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var 
			oData = RL.data(),
			f1 = Utils.settingsSaveHelperSimpleFunction(self.nameTrigger, self),
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
