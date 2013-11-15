/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {string} sId
 * @param {string} sEmail
 * @param {boolean=} bCanBeDelete = true
 * @constructor
 */
function IdentityModel(sId, sEmail, bCanBeDelete)
{
	this.id = sId;
	this.email = ko.observable(sEmail);
	this.name = ko.observable('');
	this.replyTo = ko.observable('');
	this.bcc = ko.observable('');

	this.deleteAccess = ko.observable(false);
	this.canBeDalete = ko.observable(bCanBeDelete);
}

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
