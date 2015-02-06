
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 *
	 * @param {string} sEmail
	 * @param {boolean=} bCanBeDelete = true
	 * @param {number=} iCount = 0
	 */
	function AccountModel(sEmail, bCanBeDelete, iCount)
	{
		AbstractModel.call(this, 'AccountModel');

		this.email = sEmail;

		this.count = ko.observable(iCount || 0);

		this.deleteAccess = ko.observable(false);
		this.canBeDeleted = ko.observable(Utils.isUnd(bCanBeDelete) ? true : !!bCanBeDelete);
		this.canBeEdit = this.canBeDeleted;
	}

	_.extend(AccountModel.prototype, AbstractModel.prototype);

	/**
	 * @type {string}
	 */
	AccountModel.prototype.email = '';

	/**
	 * @return {string}
	 */
	AccountModel.prototype.changeAccountLink = function ()
	{
		return require('Common/Links').change(this.email);
	};

	module.exports = AccountModel;

}());