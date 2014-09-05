
(function () {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function ContactTagModel()
	{
		this.idContactTag = 0;
		this.name = ko.observable('');
		this.readOnly = false;
	}

	ContactTagModel.prototype.parse = function (oItem)
	{
		var bResult = false;
		if (oItem && 'Object/Tag' === oItem['@Object'])
		{
			this.idContact = Utils.pInt(oItem['IdContactTag']);
			this.name(Utils.pString(oItem['Name']));
			this.readOnly = !!oItem['ReadOnly'];

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @param {string} sSearch
	 * @return {boolean}
	 */
	ContactTagModel.prototype.filterHelper = function (sSearch)
	{
		return this.name().toLowerCase().indexOf(sSearch.toLowerCase()) !== -1;
	};

	/**
	 * @param {boolean=} bEncodeHtml = false
	 * @return {string}
	 */
	ContactTagModel.prototype.toLine = function (bEncodeHtml)
	{
		return (Utils.isUnd(bEncodeHtml) ? false : !!bEncodeHtml) ?
			Utils.encodeHtml(this.name()) : this.name();
	};

	module.exports = ContactTagModel;

}());