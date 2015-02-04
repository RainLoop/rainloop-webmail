
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		HtmlEditor = require('Common/HtmlEditor'),
		Translator = require('Common/Translator'),

		AccountStore = require('Stores/User/Account'),
		IdentityStore = require('Stores/User/Identity'),

		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function IdentitiesUserSettings()
	{
		this.editor = null;
		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		this.accountEmail = AccountStore.email;

		this.displayName = AccountStore.displayName;
		this.signature = AccountStore.signature;
		this.replyTo = AccountStore.replyTo;

		this.signatureDom = ko.observable(null);

		this.defaultIdentityIDTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.identities = IdentityStore.identities;
		this.defaultIdentityID = IdentityStore.defaultIdentityID;

		this.identitiesOptions = ko.computed(function () {

			var
				aList = IdentityStore.identities(),
				aResult = []
			;

			if (0 < aList.length)
			{
				aResult.push({
					'id': AccountStore.email.peek(),
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
			return IdentityStore.identities.loading() ? Translator.i18n('SETTINGS_IDENTITIES/LOADING_PROCESS') : '';
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
	IdentitiesUserSettings.prototype.formattedAccountIdentity = function ()
	{
		var
			sDisplayName = AccountStore.displayName.peek(),
			sEmail = AccountStore.email.peek()
		;

		return '' === sDisplayName ? sEmail : '"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>';
	};

	IdentitiesUserSettings.prototype.addNewIdentity = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Identity'));
	};

	IdentitiesUserSettings.prototype.editIdentity = function (oIdentity)
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Identity'), [oIdentity]);
	};

	/**
	 * @param {IdentityModel} oIdentityToRemove
	 */
	IdentitiesUserSettings.prototype.deleteIdentity = function (oIdentityToRemove)
	{
		if (oIdentityToRemove && oIdentityToRemove.deleteAccess())
		{
			this.identityForDeletion(null);

			if (oIdentityToRemove)
			{
				IdentityStore.identities.remove(function (oIdentity) {
					return oIdentityToRemove === oIdentity;
				});

				Remote.identityDelete(function () {
					require('App/User').accountsAndIdentities();
				}, oIdentityToRemove.id);
			}
		}
	};

	IdentitiesUserSettings.prototype.onFocus = function ()
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

	IdentitiesUserSettings.prototype.onBuild = function (oDom)
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

			IdentityStore.defaultIdentityID.subscribe(function (sValue) {
				Remote.saveSettings(f4, {
					'DefaultIdentityID': sValue
				});
			});

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

		}, 50);
	};

	module.exports = IdentitiesUserSettings;

}());