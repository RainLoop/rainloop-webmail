
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		HtmlEditor = require('Common/HtmlEditor'),

		AccountStore = require('Stores/User/Account'),

		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function IdentityUserSettings()
	{
		this.editor = null;

		this.displayName = AccountStore.displayName;
		this.signature = AccountStore.signature;
		this.signatureToAll = AccountStore.signatureToAll;
		this.replyTo = AccountStore.replyTo;

		this.signatureDom = ko.observable(null);

		this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	IdentityUserSettings.prototype.onFocus = function ()
	{
		if (!this.editor && this.signatureDom())
		{
			var
				self = this,
				sSignature = AccountStore.signature()
			;

			this.editor = new HtmlEditor(self.signatureDom(), function () {
				AccountStore.signature(
					(self.editor.isHtml() ? ':HTML:' : '') + self.editor.getData()
				);
			}, function () {
				if (':HTML:' === sSignature.substr(0, 6))
				{
					self.editor.setHtml(sSignature.substr(6), false);
				}
				else
				{
					self.editor.setPlain(sSignature, false);
				}
			});
		}
	};

	IdentityUserSettings.prototype.onBuild = function ()
	{
		var self = this;
		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self)
			;

			AccountStore.displayName.subscribe(function (sValue) {
				Remote.saveSettings(f1, {
					'DisplayName': sValue
				});
			});

			AccountStore.replyTo.subscribe(function (sValue) {
				Remote.saveSettings(f2, {
					'ReplyTo': sValue
				});
			});

			AccountStore.signature.subscribe(function (sValue) {
				Remote.saveSettings(f3, {
					'Signature': sValue
				});
			});

			AccountStore.signatureToAll.subscribe(function (bValue) {
				Remote.saveSettings(null, {
					'SignatureToAll': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	module.exports = IdentityUserSettings;

}());