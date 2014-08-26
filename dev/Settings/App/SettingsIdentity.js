/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),
		_ = require('_'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		NewHtmlEditorWrapper = require('NewHtmlEditorWrapper'),

		Data = require('../../Storages/WebMailDataStorage.js'),
		Remote = require('../../Storages/WebMailAjaxRemoteStorage.js')
	;

	/**
	 * @constructor
	 */
	function SettingsIdentity()
	{
		this.editor = null;

		this.displayName = Data.displayName;
		this.signature = Data.signature;
		this.signatureToAll = Data.signatureToAll;
		this.replyTo = Data.replyTo;

		this.signatureDom = ko.observable(null);

		this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	SettingsIdentity.prototype.onFocus = function ()
	{
		if (!this.editor && this.signatureDom())
		{
			var
				self = this,
				sSignature = Data.signature()
			;

			this.editor = new NewHtmlEditorWrapper(self.signatureDom(), function () {
				Data.signature(
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

	SettingsIdentity.prototype.onBuild = function ()
	{
		var self = this;
		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self)
			;

			Data.displayName.subscribe(function (sValue) {
				Remote.saveSettings(f1, {
					'DisplayName': sValue
				});
			});

			Data.replyTo.subscribe(function (sValue) {
				Remote.saveSettings(f2, {
					'ReplyTo': sValue
				});
			});

			Data.signature.subscribe(function (sValue) {
				Remote.saveSettings(f3, {
					'Signature': sValue
				});
			});

			Data.signatureToAll.subscribe(function (bValue) {
				Remote.saveSettings(null, {
					'SignatureToAll': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	module.exports = SettingsIdentity;

}(module, require));