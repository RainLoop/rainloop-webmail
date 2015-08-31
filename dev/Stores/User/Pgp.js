(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		$ = require('$'),
		kn = require('Knoin/Knoin'),

		Translator = require('Common/Translator'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function PgpUserStore()
	{
		this.capaOpenPGP = ko.observable(false);

		this.openpgp = null;

		this.openpgpkeys = ko.observableArray([]);
		this.openpgpKeyring = null;

		this.openpgpkeysPublic = this.openpgpkeys.filter(function (oItem) {
			return !!(oItem && !oItem.isPrivate);
		});

		this.openpgpkeysPrivate = this.openpgpkeys.filter(function (oItem) {
			return !!(oItem && oItem.isPrivate);
		});
	}

	/**
	 * @return {boolean}
	 */
	PgpUserStore.prototype.isSupported = function ()
	{
		return !!this.openpgp;
	};

	PgpUserStore.prototype.findPublicKeyByHex = function (sHash)
	{
		return _.find(this.openpgpkeysPublic(), function (oItem) {
			return sHash && oItem && sHash === oItem.id;
		});
	};

	PgpUserStore.prototype.findPrivateKeyByHex = function (sHash)
	{
		return _.find(this.openpgpkeysPrivate(), function (oItem) {
			return sHash && oItem && sHash === oItem.id;
		});
	};

	PgpUserStore.prototype.findPublicKeysByEmail = function (sEmail)
	{
		return _.compact(_.flatten(_.map(this.openpgpkeysPublic(), function (oItem) {
			var oKey = oItem && sEmail === oItem.email ? oItem : null;
			return oKey ? oKey.getNativeKeys() : [null];
		}), true));
	};

	PgpUserStore.prototype.findPublicKeysBySigningKeyIds = function (aSigningKeyIds)
	{
		var self = this;
		return _.compact(_.flatten(_.map(aSigningKeyIds, function (oId) {
			var oKey = oId && oId.toHex ? self.findPublicKeyByHex(oId.toHex()) : null;
			return oKey ? oKey.getNativeKeys() : [null];
		}), true));
	};

	PgpUserStore.prototype.findPrivateKeysByEncryptionKeyIds = function (aEncryptionKeyIds, bReturnWrapKeys)
	{
		var self = this;
		return _.compact(_.flatten(_.map(aEncryptionKeyIds, function (oId) {
			var oKey = oId && oId.toHex ? self.findPrivateKeyByHex(oId.toHex()) : null;
			return oKey ? (bReturnWrapKeys ? [oKey] : oKey.getNativeKeys()) : [null];
		}), true));
	};

	/**
	 * @param {string} sEmail
	 * @return {?}
	 */
	PgpUserStore.prototype.findPublicKeyByEmailNotNative = function (sEmail)
	{
		return _.find(this.openpgpkeysPublic(), function (oItem) {
			return oItem && sEmail === oItem.email;
		}) || null;
	};

	/**
	 * @param {string} sEmail
	 * @return {?}
	 */
	PgpUserStore.prototype.findPrivateKeyByEmailNotNative = function (sEmail)
	{
		return _.find(this.openpgpkeysPrivate(), function (oItem) {
			return oItem && sEmail === oItem.email;
		}) || null;
	};

	/**
	 * @param {string} sEmail
	 * @param {string=} sPassword
	 * @return {?}
	 */
	PgpUserStore.prototype.findPrivateKeyByEmail = function (sEmail, sPassword)
	{
		var
			oPrivateKeys = [],
			oPrivateKey = null,
			oKey = _.find(this.openpgpkeysPrivate(), function (oItem) {
				return oItem && sEmail === oItem.email;
			})
		;

		if (oKey)
		{
			oPrivateKeys = oKey.getNativeKeys();
			oPrivateKey = oPrivateKeys[0] || null;

			try
			{
				if (oPrivateKey)
				{
					oPrivateKey.decrypt(Utils.pString(sPassword));
				}
			}
			catch (e)
			{
				oPrivateKey = null;
			}
		}

		return oPrivateKey;
	};

	/**
	 * @param {string=} sPassword
	 * @return {?}
	 */
	PgpUserStore.prototype.findSelfPrivateKey = function (sPassword)
	{
		return this.findPrivateKeyByEmail(require('Stores/User/Account').email(), sPassword);
	};

	PgpUserStore.prototype.decryptMessage = function (oMessage, fCallback)
	{
		var self = this, aPrivateKeys = [], aEncryptionKeyIds = [];
		if (oMessage && oMessage.getSigningKeyIds)
		{
			aEncryptionKeyIds = oMessage.getEncryptionKeyIds();
			if (aEncryptionKeyIds)
			{
				aPrivateKeys = this.findPrivateKeysByEncryptionKeyIds(aEncryptionKeyIds, true);
				if (aPrivateKeys && 0 < aPrivateKeys.length)
				{
					kn.showScreenPopup(require('View/Popup/MessageOpenPgp'), [function (oDecriptedKey) {

						if (oDecriptedKey)
						{
							var oPrivateKey = null, oDecryptedMessage = null;
							try
							{
								oDecryptedMessage = oMessage.decrypt(oDecriptedKey);
							}
							catch (e)
							{
								oDecryptedMessage = null;
							}

							if (oDecryptedMessage)
							{
								oPrivateKey = self.findPrivateKeyByHex(oDecriptedKey.primaryKey.keyid.toHex());
								if (oPrivateKey)
								{
									self.verifyMessage(oDecryptedMessage, function (oValidKey, aSigningKeyIds) {
										fCallback(oPrivateKey, oDecryptedMessage, oValidKey || null, aSigningKeyIds || null);
									});
								}
								else
								{
									fCallback(oPrivateKey, oDecryptedMessage);
								}
							}
							else
							{
								fCallback(oPrivateKey, oDecryptedMessage);
							}
						}
						else
						{
							fCallback(null, null);
						}

					}, aPrivateKeys]);

					return false;
				}
			}
		}

		fCallback(null, null);

		return false;
	};

	PgpUserStore.prototype.verifyMessage = function (oMessage, fCallback)
	{
		var oValid = null, aResult = [], aPublicKeys = [], aSigningKeyIds = [];
		if (oMessage && oMessage.getSigningKeyIds)
		{
			aSigningKeyIds = oMessage.getSigningKeyIds();
			if (aSigningKeyIds && 0 < aSigningKeyIds.length)
			{
				aPublicKeys = this.findPublicKeysBySigningKeyIds(aSigningKeyIds);
				if (aPublicKeys && 0 < aPublicKeys.length)
				{
					try
					{
						aResult = oMessage.verify(aPublicKeys);
						oValid = _.find(_.isArray(aResult) ? aResult : [], function (oItem) {
							return oItem && oItem.valid && oItem.keyid;
						});

						if (oValid && oValid.keyid && oValid.keyid && oValid.keyid.toHex)
						{
							fCallback(this.findPublicKeyByHex(oValid.keyid.toHex()));
							return true;
						}
					}
					catch (e) {}
				}

				fCallback(null, aSigningKeyIds);
				return false;
			}
		}

		fCallback(null);
		return false;
	};

	/**
	 * @param {*} mDom
	 */
	PgpUserStore.prototype.controlsHelper = function (mDom, oVerControl, bSuccess, sTitle, sText)
	{
		if (bSuccess)
		{
			mDom.removeClass('error').addClass('success').attr('title', sTitle);
			oVerControl.removeClass('error').addClass('success').attr('title', sTitle);
		}
		else
		{
			mDom.removeClass('success').addClass('error').attr('title', sTitle);
			oVerControl.removeClass('success').addClass('error').attr('title', sTitle);
		}

		if (undefined !== sText)
		{
			mDom.text(Utils.trim(sText.replace(/(\u200C|\u0002)/g, '')));
		}
	};

	/**
	 * @param {*} mDom
	 */
	PgpUserStore.prototype.initMessageBodyControls = function (mDom)
	{
		if (mDom && !mDom.hasClass('inited'))
		{
			mDom.addClass('inited');

			var
				self = this,
				bEncrypted = mDom.hasClass('encrypted'),
				bSigned = mDom.hasClass('signed'),
				oVerControl = null,
				sData = ''
			;

			if (bEncrypted || bSigned)
			{
				sData = mDom.text();
				mDom.data('openpgp-original', sData);

				if (bEncrypted)
				{
					oVerControl = $('<div class="b-openpgp-control"><i class="icon-lock"></i></div>')
						.attr('title', Translator.i18n('MESSAGE/PGP_ENCRYPTED_MESSAGE_DESC'));

					oVerControl.on('click', function () {
						if ($(this).hasClass('success'))
						{
							return false;
						}

						var oMessage = null;
						try
						{
							oMessage = self.openpgp.message.readArmored(sData);
						}
						catch (e)
						{
							Utils.log(e);
						}

						if (oMessage && oMessage.getText && oMessage.verify && oMessage.decrypt)
						{
							self.decryptMessage(oMessage, function (oValidPrivateKey, oDecriptedMessage, oValidPublicKey, aSigningKeyIds) {

								if (oDecriptedMessage)
								{
									if (oValidPublicKey)
									{
										self.controlsHelper(mDom, oVerControl, true, Translator.i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
											'USER': oValidPublicKey.user + ' (' + oValidPublicKey.id + ')'
										}), oDecriptedMessage.getText());
									}
									else if (oValidPrivateKey)
									{
										var
											aKeyIds = Utils.isNonEmptyArray(aSigningKeyIds) ? aSigningKeyIds : null,
											sAdditional = aKeyIds ? _.compact(_.map(aKeyIds, function (oItem) {
												return oItem && oItem.toHex ? oItem.toHex() : null;
											})).join(', ') : ''
										;

										self.controlsHelper(mDom, oVerControl, false,
											Translator.i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE') +
												(sAdditional ? ' (' + sAdditional + ')' : ''),
												oDecriptedMessage.getText());
									}
									else
									{
										self.controlsHelper(mDom, oVerControl, false,
											Translator.i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
									}
								}
								else
								{
									self.controlsHelper(mDom, oVerControl, false,
										Translator.i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
								}
							});

							return false;
						}

						self.controlsHelper(mDom, oVerControl, false, Translator.i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
						return false;

					});
				}
				else if (bSigned)
				{
					oVerControl = $('<div class="b-openpgp-control"><i class="icon-lock"></i></div>')
						.attr('title', Translator.i18n('MESSAGE/PGP_SIGNED_MESSAGE_DESC'));

					oVerControl.on('click', function () {

						if ($(this).hasClass('success') || $(this).hasClass('error'))
						{
							return false;
						}

						var oMessage = null;
						try
						{
							oMessage = self.openpgp.cleartext.readArmored(sData);
						}
						catch (e)
						{
							Utils.log(e);
						}

						if (oMessage && oMessage.getText && oMessage.verify)
						{
							self.verifyMessage(oMessage, function (oValidKey, aSigningKeyIds) {
								if (oValidKey)
								{
									self.controlsHelper(mDom, oVerControl, true, Translator.i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
										'USER': oValidKey.user + ' (' + oValidKey.id + ')'
									}), oMessage.getText());
								}
								else
								{
									var
										aKeyIds = Utils.isNonEmptyArray(aSigningKeyIds) ? aSigningKeyIds : null,
										sAdditional = aKeyIds ? _.compact(_.map(aKeyIds, function (oItem) {
											return oItem && oItem.toHex ? oItem.toHex() : null;
										})).join(', ') : ''
									;

									self.controlsHelper(mDom, oVerControl, false,
										Translator.i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE') +
											(sAdditional ? ' (' + sAdditional + ')' : ''));
								}
							});

							return false;
						}

						self.controlsHelper(mDom, oVerControl, false, Translator.i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
						return false;
					});
				}

				if (oVerControl)
				{
					mDom.before(oVerControl).before('<div></div>');
				}
			}
		}
	};

	module.exports = new PgpUserStore();

}());

