
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
	 * @param {string} sID
	 * @param {string} sName
	 * @param {string} sBody
	 */
	function TemplateModel(sID, sName, sBody)
	{
		AbstractModel.call(this, 'TemplateModel');

		this.id = sID;
		this.name = sName;
		this.body = sBody;
		this.populated = true;

		this.deleteAccess = ko.observable(false);
	}

	_.extend(TemplateModel.prototype, AbstractModel.prototype);

	/**
	 * @type {string}
	 */
	TemplateModel.prototype.id = '';

	/**
	 * @type {string}
	 */
	TemplateModel.prototype.name = '';

	/**
	 * @type {string}
	 */
	TemplateModel.prototype.body = '';

	/**
	 * @type {boolean}
	 */
	TemplateModel.prototype.populated = true;

	/**
	 * @type {boolean}
	 */
	TemplateModel.prototype.parse = function (oItem)
	{
		var bResult = false;
		if (oItem && 'Object/Template' === oItem['@Object'])
		{
			this.id = Utils.pString(oItem['ID']);
			this.name = Utils.pString(oItem['Name']);
			this.body = Utils.pString(oItem['Body']);
			this.populated = !!oItem['Populated'];

			bResult = true;
		}

		return bResult;
	};

	module.exports = TemplateModel;

}());