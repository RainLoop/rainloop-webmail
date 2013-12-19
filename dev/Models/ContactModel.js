/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function ContactModel()
{
	this.idContact = 0;
	this.idContactStr = '';
	this.display = '';
	this.properties = [];
	this.readOnly = false;
	this.scopeType = Enums.ContactScopeType.Default;

	this.checked = ko.observable(false);
	this.selected = ko.observable(false);
	this.deleted = ko.observable(false);
	this.shared = ko.observable(false);
}

/**
 * @return {Array|null}
 */
ContactModel.prototype.getNameAndEmailHelper = function ()
{
	var 
		sName = '',
		sEmail = ''
	;
	
	if (Utils.isNonEmptyArray(this.properties))
	{
		_.each(this.properties, function (aProperty) {
			if (aProperty)
			{
				if ('' === sName && Enums.ContactPropertyType.FullName === aProperty[0])
				{
					sName = aProperty[1];
				}
				else if ('' === sEmail && -1 < Utils.inArray(aProperty[0], [
					Enums.ContactPropertyType.EmailPersonal,
					Enums.ContactPropertyType.EmailBussines,
					Enums.ContactPropertyType.EmailOther
				]))
				{
					sEmail = aProperty[1];
				}
			}
		}, this);
	}

	return '' === sEmail ? null : [sEmail, sName];
};

ContactModel.prototype.parse = function (oItem)
{
	var bResult = false;
	if (oItem && 'Object/Contact' === oItem['@Object'])
	{
		this.idContact = Utils.pInt(oItem['IdContact']);
		this.idContactStr = Utils.pString(oItem['IdContactStr']);
		this.display = Utils.pString(oItem['Display']);
		this.readOnly = !!oItem['ReadOnly'];
		this.scopeType = Utils.pInt(oItem['ScopeType']);

		if (Utils.isNonEmptyArray(oItem['Properties']))
		{
			_.each(oItem['Properties'], function (oProperty) {
				if (oProperty && oProperty['Type'] && Utils.isNormal(oProperty['Value']))
				{
					this.properties.push([Utils.pInt(oProperty['Type']), Utils.pString(oProperty['Value'])]);
				}
			}, this);
		}

		this.shared(Enums.ContactScopeType.ShareAll === this.scopeType);
		bResult = true;
	}

	return bResult;
};

/**
 * @return {string}
 */
ContactModel.prototype.srcAttr = function ()
{
	return RL.link().emptyContactPic();
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
	if (this.shared())
	{
		aResult.push('shared');
	}

	return aResult.join(' ');
};
