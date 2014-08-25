/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		NewHtmlEditorWrapper = require('NewHtmlEditorWrapper'),

		Data = require('../Storages/WebMailDataStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),

		kn = require('kn'),
		PopupsIdentityViewModel = require('../ViewModels/Popups/PopupsIdentityViewModel.js')
	;

	/**
	 * @constructor
	 */
	function SettingsIdentities()
	{
		this.editor = null;
		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		this.accountEmail = Data.accountEmail;
		this.displayName = Data.displayName;
		this.signature = Data.signature;
		this.signatureToAll = Data.signatureToAll;
		this.replyTo = Data.replyTo;

		this.signatureDom = ko.observable(null);

		this.defaultIdentityIDTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.identities = Data.identities;
		this.defaultIdentityID = Data.defaultIdentityID;

		this.identitiesOptions = ko.computed(function () {

			var
				aList = this.identities(),
				aResult = []
			;

			if (0 < aList.length)
			{
				aResult.push({
					'id': this.accountEmail.peek(),
					'name': this.formattedAccountIdentity(),
					'seporator': false
				});

				aResult.push({
					'id': '---',
					'name': '---',
					'seporator': true,
					'disabled': true
				});

				_.each(aList, function (oItem) {
					aResult.push({
						'id': oItem.id,
						'name': oItem.formattedNameForEmail(),
						'seporator': false
					});
				});
			}

			return aResult;
		}, this);

		this.processText = ko.computed(function () {
			return Data.identitiesLoading() ? Utils.i18n('SETTINGS_IDENTITIES/LOADING_PROCESS') : '';
		}, this);

		this.visibility = ko.computed(function () {
			return '' === this.processText() ? 'hidden' : 'visible';
		}, this);

		this.identityForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.deleteAccess(true);
				}
			}
		]});
	}

	/**
	 *
	 * @return {string}
	 */
	SettingsIdentities.prototype.formattedAccountIdentity = function ()
	{
		var
			sDisplayName = this.displayName.peek(),
			sEmail = this.accountEmail.peek()
		;

		return '' === sDisplayName ? sEmail : '"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>';
	};

	SettingsIdentities.prototype.addNewIdentity = function ()
	{
		kn.showScreenPopup(PopupsIdentityViewModel);
	};

	SettingsIdentities.prototype.editIdentity = function (oIdentity)
	{
		kn.showScreenPopup(PopupsIdentityViewModel, [oIdentity]);
	};

	/**
	 * @param {IdentityModel} oIdentityToRemove
	 */
	SettingsIdentities.prototype.deleteIdentity = function (oIdentityToRemove)
	{
		if (oIdentityToRemove && oIdentityToRemove.deleteAccess())
		{
			this.identityForDeletion(null);

			var
				RL = require('../Boots/RainLoopApp.js'),
				fRemoveFolder = function (oIdentity) {
					return oIdentityToRemove === oIdentity;
				}
			;

			if (oIdentityToRemove)
			{
				this.identities.remove(fRemoveFolder);

				Remote.identityDelete(function () {
					RL.accountsAndIdentities();
				}, oIdentityToRemove.id);
			}
		}
	};

	SettingsIdentities.prototype.onFocus = function ()
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

	SettingsIdentities.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.identity-item .e-action', function () {
				var oIdentityItem = ko.dataFor(this);
				if (oIdentityItem)
				{
					self.editIdentity(oIdentityItem);
				}
			})
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self),
				f4 = Utils.settingsSaveHelperSimpleFunction(self.defaultIdentityIDTrigger, self)
			;

			Data.defaultIdentityID.subscribe(function (sValue) {
				Remote.saveSettings(f4, {
					'DefaultIdentityID': sValue
				});
			});

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

	module.exports = SettingsIdentities;

}(module, require));