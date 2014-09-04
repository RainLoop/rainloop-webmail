
(function () {

	'use strict';

	var
		ko = require('ko')
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
		this.index = iIndex;
		this.id = sID;
		this.guid = sGuID;
		this.user = sUserID;
		this.email = sEmail;
		this.armor = sArmor;
		this.isPrivate = !!bIsPrivate;

		this.deleteAccess = ko.observable(false);
	}

	OpenPgpKeyModel.prototype.index = 0;
	OpenPgpKeyModel.prototype.id = '';
	OpenPgpKeyModel.prototype.guid = '';
	OpenPgpKeyModel.prototype.user = '';
	OpenPgpKeyModel.prototype.email = '';
	OpenPgpKeyModel.prototype.armor = '';
	OpenPgpKeyModel.prototype.isPrivate = false;

	module.exports = OpenPgpKeyModel;

}());