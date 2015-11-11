
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		PgpStore = require('Stores/User/Pgp'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @param {string} iIndex
	 * @param {string} sGuID
	 * @param {string} sID
	 * @param {string} sUserID
	 * @param {string} sEmail
	 * @param {boolean} bIsPrivate
	 * @param {string} sArmor
	 * @constructor
	 */
	function OpenPgpKeyModel(iIndex, sGuID, sID, sUserID, sEmail, bIsPrivate, sArmor)
	{
		AbstractModel.call(this, 'OpenPgpKeyModel');

		this.index = iIndex;
		this.id = sID;
		this.guid = sGuID;
		this.user = sUserID;
		this.email = sEmail;
		this.armor = sArmor;
		this.isPrivate = !!bIsPrivate;

		this.deleteAccess = ko.observable(false);
	}

	_.extend(OpenPgpKeyModel.prototype, AbstractModel.prototype);

	OpenPgpKeyModel.prototype.index = 0;
	OpenPgpKeyModel.prototype.id = '';
	OpenPgpKeyModel.prototype.guid = '';
	OpenPgpKeyModel.prototype.user = '';
	OpenPgpKeyModel.prototype.email = '';
	OpenPgpKeyModel.prototype.armor = '';
	OpenPgpKeyModel.prototype.isPrivate = false;

	OpenPgpKeyModel.prototype.getNativeKey = function ()
	{
		var oKey = null;
		try
		{
			oKey = PgpStore.openpgp.key.readArmored(this.armor);
			if (oKey && !oKey.err && oKey.keys && oKey.keys[0])
			{
				return oKey;
			}
		}
		catch (e)
		{
			Utils.log(e);
		}

		return null;
	};

	OpenPgpKeyModel.prototype.getNativeKeys = function ()
	{
		var oKey = this.getNativeKey();
		return oKey && oKey.keys ? oKey.keys : null;
	};

	module.exports = OpenPgpKeyModel;

}());