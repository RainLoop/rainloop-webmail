
(function () {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 *
	 * @param {string} sEmail
	 * @param {boolean=} bCanBeDelete = true
	 */
	function AccountModel(sEmail, bCanBeDelete)
	{
		this.email = sEmail;

		this.deleteAccess = ko.observable(false);
		this.canBeDalete = ko.observable(Utils.isUnd(bCanBeDelete) ? true : !!bCanBeDelete);
	}

	/**
	 * @type {string}
	 */
	AccountModel.prototype.email = '';

	/**
	 * @return {string}
	 */
	AccountModel.prototype.changeAccountLink = function ()
	{
		return require('Common/LinkBuilder').change(this.email);
	};

	module.exports = AccountModel;

}());