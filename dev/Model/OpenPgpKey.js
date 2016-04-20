
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
	 * @param {array} aUserIDs
	 * @param {array} aEmails
	 * @param {boolean} bIsPrivate
	 * @param {string} sArmor
	 * @param {string} sUserID
	 * @constructor
	 */
	function OpenPgpKeyModel(iIndex, sGuID, sID, aUserIDs, aEmails, bIsPrivate, sArmor, sUserID)
	{
		AbstractModel.call(this, 'OpenPgpKeyModel');

		this.index = iIndex;
		this.id = sID;
		this.guid = sGuID;
		this.users = aUserIDs;
		this.emails = aEmails;
		this.armor = sArmor;
		this.isPrivate = !!bIsPrivate;
		this.selectUser(sUserID);

		this.deleteAccess = ko.observable(false);
	}

	_.extend(OpenPgpKeyModel.prototype, AbstractModel.prototype);

	OpenPgpKeyModel.prototype.index = 0;
	OpenPgpKeyModel.prototype.id = '';
	OpenPgpKeyModel.prototype.guid = '';
	OpenPgpKeyModel.prototype.user = '';
	OpenPgpKeyModel.prototype.users = [];
	OpenPgpKeyModel.prototype.email = '';
	OpenPgpKeyModel.prototype.emails = [];
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

	OpenPgpKeyModel.prototype.select = function (sPattern, sProperty)
	{
		var index = this[sProperty].indexOf(sPattern);

		if (index !== -1) {
			this.user = this.users[index];
			this.email = this.emails[index];
		}
	};

	OpenPgpKeyModel.prototype.selectUser = function (sUser)
	{
		this.select(sUser, 'users');
	};

	OpenPgpKeyModel.prototype.selectEmail = function (sEmail)
	{
		this.select(sEmail, 'emails');
	};

	module.exports = OpenPgpKeyModel;

}());
