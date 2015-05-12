
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 */
	function FilterConditionModel()
	{
		AbstractModel.call(this, 'FilterConditionModel');

		this.field = ko.observable(Enums.FilterConditionField.From);
		this.type = ko.observable(Enums.FilterConditionType.Contains);
		this.value = ko.observable('');
		this.value.error = ko.observable(false);

		this.valueSecond = ko.observable('');
		this.valueSecond.error = ko.observable(false);

		this.template = ko.computed(function () {

			var sTemplate = '';
			switch (this.field())
			{
				case Enums.FilterConditionField.Size:
					sTemplate = 'SettingsFiltersConditionSize';
					break;
				case Enums.FilterConditionField.Header:
					sTemplate = 'SettingsFiltersConditionMore';
					break;
				default:
					sTemplate = 'SettingsFiltersConditionDefault';
					break;
			}

			return sTemplate;

		}, this);

		this.field.subscribe(function () {
			this.value('');
			this.valueSecond('');
		}, this);

		this.regDisposables([this.template]);
	}

	_.extend(FilterConditionModel.prototype, AbstractModel.prototype);

	FilterConditionModel.prototype.verify = function ()
	{
		if ('' === this.value())
		{
			this.value.error(true);
			return false;
		}

		if (Enums.FilterConditionField.Header === this.field() && '' === this.valueSecond())
		{
			this.valueSecond.error(true);
			return false;
		}

		return true;
	};

	FilterConditionModel.prototype.parse = function (oItem)
	{
		if (oItem && oItem['Field'] && oItem['Type'])
		{
			this.field(Utils.pString(oItem['Field']));
			this.type(Utils.pString(oItem['Type']));
			this.value(Utils.pString(oItem['Value']));
			this.valueSecond(Utils.pString(oItem['ValueSecond']));

			return true;
		}

		return false;
	};

	FilterConditionModel.prototype.toJson = function ()
	{
		return {
			'Field': this.field(),
			'Type': this.type(),
			'Value': this.value(),
			'ValueSecond': this.valueSecond()
		};
	};

	FilterConditionModel.prototype.cloneSelf = function ()
	{
		var oClone = new FilterConditionModel();

		oClone.field(this.field());
		oClone.type(this.type());
		oClone.value(this.value());
		oClone.valueSecond(this.valueSecond());

		return oClone;
	};

	module.exports = FilterConditionModel;

}());