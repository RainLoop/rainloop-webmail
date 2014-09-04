
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 * @param {number=} iType = Enums.ContactPropertyType.Unknown
	 * @param {string=} sTypeStr = ''
	 * @param {string=} sValue = ''
	 * @param {boolean=} bFocused = false
	 * @param {string=} sPlaceholder = ''
	 */
	function ContactPropertyModel(iType, sTypeStr, sValue, bFocused, sPlaceholder)
	{
		this.type = ko.observable(Utils.isUnd(iType) ? Enums.ContactPropertyType.Unknown : iType);
		this.typeStr = ko.observable(Utils.isUnd(sTypeStr) ? '' : sTypeStr);
		this.focused = ko.observable(Utils.isUnd(bFocused) ? false : !!bFocused);
		this.value = ko.observable(Utils.pString(sValue));

		this.placeholder = ko.observable(sPlaceholder || '');

		this.placeholderValue = ko.computed(function () {
			var sPlaceholder = this.placeholder();
			return sPlaceholder ? Utils.i18n(sPlaceholder) : '';
		}, this);

		this.largeValue = ko.computed(function () {
			return Enums.ContactPropertyType.Note === this.type();
		}, this);
	}

	module.exports = ContactPropertyModel;

}());