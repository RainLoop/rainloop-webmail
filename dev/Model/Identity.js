
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @param {string} sId
	 * @param {string} sEmail
	 * @param {boolean=} bCanBeDelete = true
	 * @constructor
	 */
	function IdentityModel(sId, sEmail, bCanBeDelete)
	{
		AbstractModel.call(this, 'IdentityModel');

		this.id = sId;
		this.email = ko.observable(sEmail);
		this.name = ko.observable('');
		this.replyTo = ko.observable('');
		this.bcc = ko.observable('');

		this.deleteAccess = ko.observable(false);
		this.canBeDalete = ko.observable(bCanBeDelete);
	}

	_.extend(IdentityModel.prototype, AbstractModel.prototype);

	IdentityModel.prototype.formattedName = function ()
	{
		var sName = this.name();
		return '' === sName ? this.email() : sName + ' <' + this.email() + '>';
	};

	IdentityModel.prototype.formattedNameForCompose = function ()
	{
		var sName = this.name();
		return '' === sName ? this.email() : sName + ' (' + this.email() + ')';
	};

	IdentityModel.prototype.formattedNameForEmail = function ()
	{
		var sName = this.name();
		return '' === sName ? this.email() : '"' + Utils.quoteName(sName) + '" <' + this.email() + '>';
	};

	module.exports = IdentityModel;

}());