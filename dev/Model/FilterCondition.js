
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
	function FilterConditionModel()
	{
		AbstractModel.call(this, 'FilterConditionModel');

		this.field = ko.observable(Enums.FilterConditionField.From);
		this.type = ko.observable(Enums.FilterConditionType.EqualTo);
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

	FilterConditionModel.prototype.toJson = function ()
	{
		return {
			'Field': this.field(),
			'Type': this.type(),
			'Value': this.value()
		};
	};

	FilterConditionModel.prototype.cloneSelf = function ()
	{
		var oClone = new FilterConditionModel();

		oClone.field(this.field());
		oClone.type(this.type());
		oClone.value(this.value());

		return oClone;
	};

	module.exports = FilterConditionModel;

}());