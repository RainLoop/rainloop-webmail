/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsIdentity()
{
	var oData = RL.data();

	this.editor = null;
	
	this.displayName = oData.displayName;
	this.signature = oData.signature;
	this.signatureToAll = oData.signatureToAll;
	this.replyTo = oData.replyTo;

	this.signatureDom = ko.observable(null);

	this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(SettingsIdentity, 'SettingsIdentity', 'SETTINGS_LABELS/LABEL_IDENTITY_NAME', 'identity');

SettingsIdentity.prototype.onHide = function ()
{
	if (this.editor)
	{
		this.editor.hideEditorToolbar();
	}
};

SettingsIdentity.prototype.onFocus = function ()
{
	if (!this.editor && this.signatureDom())
	{
		var
			self = this,
			sSignature = RL.data().signature()
		;

		this.editor = new HtmlEditorWrapper(self.signatureDom(), function () {
			RL.data().signature(
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

		this.editor.addInputFormatStyle();

		Utils.initOnStartOrLangChange(function () {
			self.editor.setupLang(
				Utils.i18n('EDITOR/TEXT_SWITCHER_RICH_FORMATTING'),
				Utils.i18n('EDITOR/TEXT_SWITCHER_PLAINT_TEXT')
			);
		});
	}
};

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

		oData.signatureToAll.subscribe(function (bValue) {
			RL.remote().saveSettings(null, {
				'SignatureToAll': bValue ? '1' : '0'
			});
		});
		
	}, 50);
};
