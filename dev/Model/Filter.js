
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		FilterConditionModel = require('Model/FilterCondition'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 */
	function FilterModel()
	{
		AbstractModel.call(this, 'FilterModel');

		this.isNew = ko.observable(true);
		this.enabled = ko.observable(true);

		this.name = ko.observable('');

		this.conditionsType = ko.observable(Enums.FilterRulesType.All);

		this.conditions = ko.observableArray([]);

		// Actions
		this.actionMarkAsRead = ko.observable(false);
		this.actionSkipOtherFilters = ko.observable(true);
		this.actionValue = ko.observable('');

		this.actionType = ko.observable(Enums.FiltersAction.Move);
		this.actionTypeOptions = [ // TODO i18n
			{'id': Enums.FiltersAction.None, 'name': 'None'},
			{'id': Enums.FiltersAction.Move, 'name': ' Move to'},
	//		{'id': Enums.FiltersAction.Forward, 'name': 'Forward to'},
			{'id': Enums.FiltersAction.Discard, 'name': 'Discard'}
		];

		this.enableSkipOtherFilters = ko.computed(function () {
			return -1 === Utils.inArray(this.actionType(), [
				Enums.FiltersAction.Move, Enums.FiltersAction.Forward, Enums.FiltersAction.Discard
			]);
		}, this);

		this.actionSkipOtherFiltersResult = ko.computed({
			'read': function () {
				return this.actionSkipOtherFilters() ||
					!this.enableSkipOtherFilters();
			},
			'write': this.actionSkipOtherFilters,
			'owner': this
		});

		this.actionTemplate = ko.computed(function () {

			var sTemplate = '';
			switch (this.actionType())
			{
				default:
				case Enums.FiltersAction.Move:
					sTemplate = 'SettingsFiltersActionValueAsFolders';
					break;
				case Enums.FiltersAction.Forward:
					sTemplate = 'SettingsFiltersActionWithValue';
					break;
				case Enums.FiltersAction.None:
				case Enums.FiltersAction.Discard:
					sTemplate = 'SettingsFiltersActionNoValue';
					break;
			}

			return sTemplate;

		}, this);

		this.regDisposables(this.conditions.subscribe(function () {
			Utils.windowResize();
		}));

		this.regDisposables([this.enableSkipOtherFilters, this.actionSkipOtherFiltersResult, this.actionTemplate]);
	}

	_.extend(FilterModel.prototype, AbstractModel.prototype);

	FilterModel.prototype.addCondition = function ()
	{
		this.conditions.push(new FilterConditionModel(this.conditions));
	};

	FilterModel.prototype.parse = function (oItem)
	{
		var bResult = false;
		if (oItem && 'Object/Filter' === oItem['@Object'])
		{
			this.name(Utils.pString(oItem['Name']));

			bResult = true;
		}

		return bResult;
	};

	module.exports = FilterModel;

}());