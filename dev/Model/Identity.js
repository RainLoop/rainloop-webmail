
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @param {string} sId
	 * @param {string} sEmail
	 * @constructor
	 */
	function IdentityModel(sId, sEmail)
	{
		AbstractModel.call(this, 'IdentityModel');

		this.id = ko.observable(sId);
		this.email = ko.observable(sEmail);
		this.name = ko.observable('');

		this.replyTo = ko.observable('');
		this.bcc = ko.observable('');

		this.signature = ko.observable('');
		this.signatureInsertBefore = ko.observable(false);

		this.deleteAccess = ko.observable(false);
		this.canBeDeleted = ko.computed(function () {
			return '' !== this.id();
		}, this);
	}

	_.extend(IdentityModel.prototype, AbstractModel.prototype);

	IdentityModel.prototype.formattedName = function ()
	{
		var
			sName = this.name(),
			sEmail = this.email()
		;

		return ('' !== sName) ? sName + ' (' + sEmail + ')' : sEmail;
	};

	module.exports = IdentityModel;

}());