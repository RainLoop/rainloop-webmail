(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

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
			return oItem && sHash === oItem.id;
		});
	};

	PgpUserStore.prototype.findPublicKeysByEmail = function (sEmail)
	{
		var self = this;
		return _.compact(_.map(this.openpgpkeysPublic(), function (oItem) {

			var oKey = null;
			if (oItem && sEmail === oItem.email)
			{
				try
				{
					oKey = self.openpgp.key.readArmored(oItem.armor);
					if (oKey && !oKey.err && oKey.keys && oKey.keys[0])
					{
						return oKey.keys[0];
					}
				}
				catch (e) {}
			}

			return null;

		}));
	};

	/**
	 * @param {string} sEmail
	 * @param {string=} sPassword
	 * @return {?}
	 */
	PgpUserStore.prototype.findPrivateKeyByEmail = function (sEmail, sPassword)
	{
		var
			oPrivateKey = null,
			oKey = _.find(this.openpgpkeysPrivate(), function (oItem) {
				return oItem && sEmail === oItem.email;
			})
		;

		if (oKey)
		{
			try
			{
				oPrivateKey = this.openpgp.key.readArmored(oKey.armor);
				if (oPrivateKey && !oPrivateKey.err && oPrivateKey.keys && oPrivateKey.keys[0])
				{
					oPrivateKey = oPrivateKey.keys[0];
					oPrivateKey.decrypt(Utils.pString(sPassword));
				}
				else
				{
					oPrivateKey = null;
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

	module.exports = new PgpUserStore();

}());

