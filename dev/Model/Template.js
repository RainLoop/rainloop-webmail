
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

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

	module.exports = TemplateModel;

}());