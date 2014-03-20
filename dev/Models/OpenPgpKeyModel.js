/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {string} iIndex
 * @param {string} sGuID
 * @param {string} sID
 * @param {string} sUserID
 * @param {boolean} bIsPrivate
 * @param {string} sArmor
 * @constructor
 */
function OpenPgpKeyModel(iIndex, sGuID, sID, sUserID, bIsPrivate, sArmor)
{
	this.index = iIndex;
	this.id = sID;
	this.guid = sGuID;
	this.user = sUserID;
	this.armor = sArmor;
	this.isPrivate = !!bIsPrivate;
	
	this.deleteAccess = ko.observable(false);
}

OpenPgpKeyModel.prototype.index = 0;
OpenPgpKeyModel.prototype.id = '';
OpenPgpKeyModel.prototype.guid = '';
OpenPgpKeyModel.prototype.user = '';
OpenPgpKeyModel.prototype.armor = '';
OpenPgpKeyModel.prototype.isPrivate = false;
