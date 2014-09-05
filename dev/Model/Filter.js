
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		FilterConditionModel = require('Model/FilterCondition')
	;

	/**
	 * @constructor
	 */
	function FilterModel()
	{
		this.isNew = ko.observable(true);
		this.enabled = ko.observable(true);

		this.name = ko.observable('');

		this.conditionsType = ko.observable(Enums.FilterRulesType.And);

		this.conditions = ko.observableArray([]);

		this.conditions.subscribe(function () {
			Utils.windowResize();
		});

		// Actions
		this.actionMarkAsRead = ko.observable(false);
		this.actionSkipOtherFilters = ko.observable(true);
		this.actionValue = ko.observable('');

		this.actionType = ko.observable(Enums.FiltersAction.Move);
		this.actionTypeOptions = [ // TODO i18n
			{'id': Enums.FiltersAction.None, 'name': 'Action - None'},
			{'id': Enums.FiltersAction.Move, 'name': 'Action - Move to'},
	//		{'id': Enums.FiltersAction.Forward, 'name': 'Action - Forward to'},
			{'id': Enums.FiltersAction.Discard, 'name': 'Action - Discard'}
		];

		this.actionMarkAsReadVisiblity = ko.computed(function () {
			return -1 < Utils.inArray(this.actionType(), [
				Enums.FiltersAction.None, Enums.FiltersAction.Forward, Enums.FiltersAction.Move
			]);
		}, this);

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
	}

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