/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {string} iIndex
 * @param {string} sID
 * @param {string} sUserID
 * @param {boolean} bIsPrivate
 * @param {string} sArmor
 * @constructor
 */
function OpenPgpKeyModel(iIndex, sID, sUserID, bIsPrivate, sArmor)
{
	this.index = iIndex;
	this.id = sID;
	this.user = sUserID;
	this.armor = sArmor;
	this.isPrivate = !!bIsPrivate;
	
	this.deleteAccess = ko.observable(false);
}

OpenPgpKeyModel.prototype.index = 0;
OpenPgpKeyModel.prototype.id = '';
OpenPgpKeyModel.prototype.user = '';
OpenPgpKeyModel.prototype.armor = '';
OpenPgpKeyModel.prototype.isPrivate = false;
