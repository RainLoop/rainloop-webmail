
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 */
	function ContactModel()
	{
		AbstractModel.call(this, 'ContactModel');

		this.idContact = 0;
		this.display = '';
		this.properties = [];
		this.readOnly = false;

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.checked = ko.observable(false);
		this.deleted = ko.observable(false);
	}

	_.extend(ContactModel.prototype, AbstractModel.prototype);

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
					if (Enums.ContactPropertyType.FirstName === aProperty[0])
					{
						sName = Utils.trim(aProperty[1] + ' ' + sName);
					}
					else if (Enums.ContactPropertyType.LastName === aProperty[0])
					{
						sName = Utils.trim(sName + ' ' + aProperty[1]);
					}
					else if ('' === sEmail && Enums.ContactPropertyType.Email === aProperty[0])
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
			this.display = Utils.pString(oItem['Display']);
			this.readOnly = !!oItem['ReadOnly'];

			if (Utils.isNonEmptyArray(oItem['Properties']))
			{
				_.each(oItem['Properties'], function (oProperty) {
					if (oProperty && oProperty['Type'] && Utils.isNormal(oProperty['Value']) && Utils.isNormal(oProperty['TypeStr']))
					{
						this.properties.push([Utils.pInt(oProperty['Type']), Utils.pString(oProperty['Value']), Utils.pString(oProperty['TypeStr'])]);
					}
				}, this);
			}

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @return {string}
	 */
	ContactModel.prototype.srcAttr = function ()
	{
		return Links.emptyContactPic();
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
	ContactModel.prototype.lineAsCss = function ()
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
		if (this.focused())
		{
			aResult.push('focused');
		}

		return aResult.join(' ');
	};

	module.exports = ContactModel;

}());