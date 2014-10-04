
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @param {*} oKoList
	 * @constructor
	 */
	function FilterConditionModel(oKoList)
	{
		AbstractModel.call(this, 'FilterConditionModel');

		this.parentList = oKoList;

		this.field = ko.observable(Enums.FilterConditionField.From);

		this.fieldOptions = [ // TODO i18n
			{'id': Enums.FilterConditionField.From, 'name': 'From'},
			{'id': Enums.FilterConditionField.Recipient, 'name': 'Recipient (To or CC)'},
			{'id': Enums.FilterConditionField.To, 'name': 'To'},
			{'id': Enums.FilterConditionField.Subject, 'name': 'Subject'}
		];

		this.type = ko.observable(Enums.FilterConditionType.EqualTo);

		this.typeOptions = [ // TODO i18n
			{'id': Enums.FilterConditionType.EqualTo, 'name': 'Equal To'},
			{'id': Enums.FilterConditionType.NotEqualTo, 'name': 'Not Equal To'},
			{'id': Enums.FilterConditionType.Contains, 'name': 'Contains'},
			{'id': Enums.FilterConditionType.NotContains, 'name': 'Not Contains'}
		];

		this.value = ko.observable('');

		this.template = ko.computed(function () {

			var sTemplate = '';
			switch (this.type())
			{
				default:
					sTemplate = 'SettingsFiltersConditionDefault';
					break;
			}

			return sTemplate;

		}, this);

		this.regDisposables([this.template]);
	}

	_.extend(FilterConditionModel.prototype, AbstractModel.prototype);

	FilterConditionModel.prototype.removeSelf = function ()
	{
		this.parentList.remove(this);
	};

	module.exports = FilterConditionModel;

}());