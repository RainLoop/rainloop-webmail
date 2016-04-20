
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Utils = require('Common/Utils'),
		Enums = require('Common/Enums'),
		Translator = require('Common/Translator'),

		PgpStore = require('Stores/User/Pgp'),

		EmailModel = require('Model/Email'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function ComposeOpenPgpPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsComposeOpenPgp');

		var self = this;

		this.publicKeysOptionsCaption = Translator.i18n('PGP_NOTIFICATIONS/ADD_A_PUBLICK_KEY');
		this.privateKeysOptionsCaption = Translator.i18n('PGP_NOTIFICATIONS/SELECT_A_PRIVATE_KEY');

		this.notification = ko.observable('');

		this.sign = ko.observable(false);
		this.encrypt = ko.observable(false);

		this.password = ko.observable('');
		this.password.focus = ko.observable(false);
		this.buttonFocus = ko.observable(false);

		this.text = ko.observable('');
		this.selectedPrivateKey = ko.observable(null);
		this.selectedPublicKey = ko.observable(null);

		this.signKey = ko.observable(null);
		this.encryptKeys = ko.observableArray([]);

		this.encryptKeysView = ko.computed(function () {
			return _.compact(_.map(this.encryptKeys(), function (oKey) {
				return oKey ? oKey.key : null;
			}));
		}, this);

		this.privateKeysOptions = ko.computed(function () {
			return _.compact(_.flatten(_.map(PgpStore.openpgpkeysPrivate(), function (oKey, iIndex) {
				return self.signKey() && self.signKey().key.id === oKey.id ? null :
					_.map(oKey.users, function (sUser) {
						return {
							'id': oKey.guid,
							'name': '(' + oKey.id.substr(-8).toUpperCase() + ') ' + sUser,
							'key': oKey,
							'class': iIndex % 2 ? 'odd' : 'even'
						};
				});
			}), true));
		});

		this.publicKeysOptions = ko.computed(function () {
			return _.compact(_.flatten(_.map(PgpStore.openpgpkeysPublic(), function (oKey, iIndex) {
				return -1 < Utils.inArray(oKey, self.encryptKeysView()) ? null :
					_.map(oKey.users, function (sUser) {
						return {
							'id': oKey.guid,
							'name': '(' + oKey.id.substr(-8).toUpperCase() + ') ' + sUser,
							'key': oKey,
							'class': iIndex % 2 ? 'odd' : 'even'
						};
				});
			}), true));
		});

		this.submitRequest = ko.observable(false);

		this.resultCallback = null;

		// commands
		this.doCommand = Utils.createCommand(this, function () {

			var
				bResult = true,
				oPrivateKey = null,
				aPrivateKeys = [],
				aPublicKeys = []
			;

			this.submitRequest(true);

			if (bResult && this.sign())
			{
				if (!this.signKey())
				{
					this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND'));
					bResult = false;
				}
				else if (!this.signKey().key)
				{
					this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND_FOR', {
						'EMAIL': this.signKey().email
					}));

					bResult = false;
				}

				if (bResult)
				{
					aPrivateKeys = this.signKey().key.getNativeKeys();
					oPrivateKey = aPrivateKeys[0] || null;

					try
					{
						if (oPrivateKey)
						{
							oPrivateKey.decrypt(Utils.pString(this.password()));
						}
					}
					catch (e)
					{
						oPrivateKey = null;
					}

					if (!oPrivateKey)
					{
						this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND'));
						bResult = false;
					}
				}
			}

			if (bResult && this.encrypt())
			{
				if (0 === this.encryptKeys().length)
				{
					this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND'));
					bResult = false;
				}
				else if (this.encryptKeys())
				{
					aPublicKeys = [];

					_.each(this.encryptKeys(), function (oKey) {
						if (oKey && oKey.key)
						{
							aPublicKeys = aPublicKeys.concat(_.compact(_.flatten(oKey.key.getNativeKeys())));
						}
						else if (oKey && oKey.email)
						{
							self.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
								'EMAIL': oKey.email
							}));

							bResult = false;
						}
					});

					if (bResult && (0 === aPublicKeys.length || this.encryptKeys().length !== aPublicKeys.length))
					{
						bResult = false;
					}
				}
			}

			if (bResult && self.resultCallback)
			{
				_.delay(function () {

					var oPromise = null;

					try
					{
						if (oPrivateKey && 0 === aPublicKeys.length)
						{
							oPromise = PgpStore.openpgp.signClearMessage([oPrivateKey], self.text());
						}
						else if (oPrivateKey && 0 < aPublicKeys.length)
						{
							oPromise = PgpStore.openpgp.signAndEncryptMessage(aPublicKeys, oPrivateKey, self.text());
						}
						else if (!oPrivateKey && 0 < aPublicKeys.length)
						{
							oPromise = PgpStore.openpgp.encryptMessage(aPublicKeys, self.text());
						}
					}
					catch (e)
					{
						Utils.log(e);

						self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
							'ERROR': '' + e
						}));
					}

					if (oPromise)
					{
						try
						{
							oPromise.then(function (mData) {

								self.resultCallback(mData);
								self.cancelCommand();

							})['catch'](function (e) {
								self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
									'ERROR': '' + e
								}));
							});
						}
						catch (e)
						{
							self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
								'ERROR': '' + e
							}));
						}
					}

					self.submitRequest(false);

				}, 10);
			}
			else
			{
				self.submitRequest(false);
			}

			return bResult;

		}, function () {
			return !this.submitRequest() &&	(this.sign() || this.encrypt());
		});

		this.selectCommand = Utils.createCommand(this, function () {

			var
				sKeyId = this.selectedPrivateKey(),
				oKey = null,
				aKeys = this.encryptKeys(),
				oOption = sKeyId ? _.find(this.privateKeysOptions(), function (oItem) {
					return oItem && sKeyId === oItem.id;
				}) : null
			;

			if (oOption)
			{
				oKey = {
					'empty': !oOption.key,
					'selected': ko.observable(!!oOption.key),
					'users': oOption.key.users,
					'hash': oOption.key.id.substr(-8).toUpperCase(),
					'key': oOption.key
				};

				this.signKey(oKey);
			}
		});

		this.addCommand = Utils.createCommand(this, function () {

			var
				sKeyId = this.selectedPublicKey(),
				aKeys = this.encryptKeys(),
				oOption = sKeyId ? _.find(this.publicKeysOptions(), function (oItem) {
					return oItem && sKeyId === oItem.id;
				}) : null
			;

			if (oOption)
			{
				aKeys.push({
					'empty': !oOption.key,
					'selected': ko.observable(!!oOption.key),
					'removable': ko.observable(!this.sign() || !this.signKey() || this.signKey().key.id !== oOption.key.id),
					'users': oOption.key.users,
					'hash': oOption.key.id.substr(-8).toUpperCase(),
					'key': oOption.key
				});

				this.encryptKeys(aKeys);
			}
		});

		this.updateCommand = Utils.createCommand(this, function () {

			var self = this;

			_.each(this.encryptKeys(), function (oKey) {
				oKey.removable(!self.sign() || !self.signKey() || self.signKey().key.id !== oKey.key.id);
			});

		});

		this.selectedPrivateKey.subscribe(function (sValue) {
			if (sValue)
			{
				this.selectCommand();
				this.updateCommand();
			}
		}, this);

		this.selectedPublicKey.subscribe(function (sValue) {
			if (sValue)
			{
				this.addCommand();
			}
		}, this);

		this.sDefaultKeyScope = Enums.KeyState.PopupComposeOpenPGP;
		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		this.deletePublickKey = _.bind(this.deletePublickKey, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/ComposeOpenPgp', 'PopupsComposeOpenPgpViewModel'], ComposeOpenPgpPopupView);
	_.extend(ComposeOpenPgpPopupView.prototype, AbstractView.prototype);

	ComposeOpenPgpPopupView.prototype.addOptionClass = function (oDomOption, oItem)
	{
		this.defautOptionsAfterRender(oDomOption, oItem);

		if (oItem)
		{
			oDomOption.classList.add(oItem['class']);
		}
	};

	ComposeOpenPgpPopupView.prototype.deletePublickKey = function (oKey)
	{
		this.encryptKeys.remove(oKey);
	};

	ComposeOpenPgpPopupView.prototype.clearPopup = function ()
	{
		this.notification('');

		this.sign(false);
		this.encrypt(false);

		this.password('');
		this.password.focus(false);
		this.buttonFocus(false);

		this.signKey(null);
		this.encryptKeys([]);
		this.text('');

		this.resultCallback = null;
	};

	ComposeOpenPgpPopupView.prototype.onBuild = function ()
	{
		key('tab,shift+tab', Enums.KeyState.PopupComposeOpenPGP, _.bind(function () {

			switch (true)
			{
				case this.password.focus():
					this.buttonFocus(true);
					break;
				case this.buttonFocus():
					this.password.focus(true);
					break;
			}

			return false;

		}, this));
	};

	ComposeOpenPgpPopupView.prototype.onHideWithDelay = function ()
	{
		this.clearPopup();
	};

	ComposeOpenPgpPopupView.prototype.onShowWithDelay = function ()
	{
		if (this.sign())
		{
			this.password.focus(true);
		}
		else
		{
			this.buttonFocus(true);
		}
	};

	ComposeOpenPgpPopupView.prototype.onShow = function (fCallback, sText, oIdentity, sTo, sCc, sBcc)
	{
		this.clearPopup();

		var
			self = this,
			aRec = [],
			sEmail = '',
			aKeys = [],
			oKey = null,
			oEmail = new EmailModel()
		;

		this.resultCallback = fCallback;

		if ('' !== sTo)
		{
			aRec.push(sTo);
		}

		if ('' !== sCc)
		{
			aRec.push(sCc);
		}

		if ('' !== sBcc)
		{
			aRec.push(sBcc);
		}

		aRec = aRec.join(', ').split(',');
		aRec = _.compact(_.map(aRec, function (sValue) {
			oEmail.clear();
			oEmail.mailsoParse(Utils.trim(sValue));
			return '' === oEmail.email ? false : oEmail.email;
		}));

		if (oIdentity && oIdentity.email())
		{
			sEmail = oIdentity.email();
			aRec.unshift(sEmail);
			aKeys = PgpStore.findAllPrivateKeysByEmailNotNative(sEmail);
			if (aKeys)
			{
				var oKey = aKeys[0];
				this.signKey({
					'users': oKey.users || [sEmail],
					'hash': oKey.id.substr(-8).toUpperCase(),
					'key': oKey
				});
			}
		}

		if (this.signKey())
		{
			this.sign(true);
		}

		if (aRec && 0 < aRec.length)
		{
<<<<<<< HEAD
			this.encryptKeys(_.uniq(_.compact(_.flatten(_.map(aRec, function (sEmail) {
				var aKeys = PgpStore.findAllPublicKeysByEmailNotNative(sEmail);
				return aKeys ? _.map(aKeys, function (oKey) {
					return {
						'empty': !oKey,
						'selected': ko.observable(!!oKey),
						'removable': ko.observable(!self.sign() || !self.signKey() || self.signKey().key.id !== oKey.id),
						'users': oKey ? (oKey.users || [sEmail]) : [sEmail],
						'hash': oKey ? oKey.id.substr(-8).toUpperCase() : '',
						'key': oKey
					};
				}) : [];
			}), true)), function (oEncryptKey) {
=======
			this.encryptKeys(_.uniq(_.compact(_.map(aRec, function (sEmail) {
				var oKey = PgpStore.findPublicKeyByEmailNotNative(sEmail) || null;
				return {
					'empty': !oKey,
					'selected': ko.observable(!!oKey),
					'removable': oIdentity && oIdentity.email() && oIdentity.email() !== sEmail,
					'users': oKey ? (oKey.users || [sEmail]) : [sEmail],
					'hash': oKey ? oKey.id.substr(-8).toUpperCase() : '',
					'key': oKey
				};
			})), function (oEncryptKey) {
>>>>>>> master
				return oEncryptKey.hash;
			}));

			if (0 < this.encryptKeys().length)
			{
				this.encrypt(true);
			}
		}

		this.text(sText);
	};

	module.exports = ComposeOpenPgpPopupView;

}());
