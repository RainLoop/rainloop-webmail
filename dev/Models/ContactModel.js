/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function ContactModel()
{
	this.idContact = 0;
	this.imageHash = '';
	this.listName = '';
	this.name = '';
	this.emails = [];

	this.checked = ko.observable(false);
	this.selected = ko.observable(false);
	this.deleted = ko.observable(false);
}

ContactModel.prototype.parse = function (oItem)
{
	var bResult = false;
	if (oItem && 'Object/Contact' === oItem['@Object'])
	{
		this.idContact = Utils.pInt(oItem['IdContact']);
		this.listName = Utils.pString(oItem['ListName']);
		this.name = Utils.pString(oItem['Name']);
		this.emails = Utils.isNonEmptyArray(oItem['Emails']) ? oItem['Emails'] : [];
		this.imageHash = Utils.pString(oItem['ImageHash']);
		
		bResult = true;
	}

	return bResult;
};

/**
 * @return {string}
 */
ContactModel.prototype.srcAttr = function ()
{
	return '' === this.imageHash ? RL.link().emptyContactPic() :
		RL.link().getUserPicUrlFromHash(this.imageHash);
};

/**
 * @return {string}
 */
ContactModel.prototype.generateUid = function ()
{
	return '' + this.idContact;
};

/**
 * @return string
 */
ContactModel.prototype.lineAsCcc = function ()
{
	var aResult = [];
	if (this.deleted())
	{
		aResult.push('deleted');
	}
	if (this.selected())
	{
		aResult.push('selected');
	}
	if (this.checked())
	{
		aResult.push('checked');
	}

	return aResult.join(' ');
};
