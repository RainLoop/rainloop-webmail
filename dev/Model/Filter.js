
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

		this.enabled = ko.observable(true);

		this.id = '';

		this.name = ko.observable('');
		this.name.error = ko.observable(false);
		this.name.focused = ko.observable(false);

		this.raw = ko.observable('');

		this.conditions = ko.observableArray([]);
		this.conditionsType = ko.observable(Enums.FilterRulesType.Any);

		// Actions
		this.actionValue = ko.observable('');
		this.actionMarkAsRead = ko.observable(false);

		this.actionSkipOthers = ko.observable(false);

		this.keepForward = ko.observable(true);

		this.actionType = ko.observable(Enums.FiltersAction.MoveTo);

		this.actionType.subscribe(function (sValue) {
			this.actionValue('');
		}, this);

		this.actionTemplate = ko.computed(function () {

			var sTemplate = '';
			switch (this.actionType())
			{
				default:
				case Enums.FiltersAction.MoveTo:
					sTemplate = 'SettingsFiltersActionValueAsFolders';
					break;
//				case Enums.FiltersAction.Forward:
//					sTemplate = 'SettingsFiltersActionWithValue';
//					break;
				case Enums.FiltersAction.Forward:
					sTemplate = 'SettingsFiltersActionForward';
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

		this.regDisposables(this.name.subscribe(function (sValue) {
			this.name.error('' === sValue);
		}, this));

		this.regDisposables([this.actionTemplate]);

		this.deleteAccess = ko.observable(false);
		this.canBeDalete = ko.observable(true);
	}

	_.extend(FilterModel.prototype, AbstractModel.prototype);

	FilterModel.prototype.generateID = function ()
	{
		this.id = Utils.fakeMd5();
	};

	FilterModel.prototype.toJson = function ()
	{
		return {
			'ID': this.id,
			'Enabled': this.enabled() ? '1' : '0',
			'Name': this.name(),
			'ConditionsType': this.conditionsType(),
			'Conditions': _.map(this.conditions(), function (oItem) {
				return oItem.toJson();
			}),

			'ActionValue': this.actionValue(),
			'ActionType': this.actionType(),

			'Raw': this.raw(),

			'MarkAsRead': this.actionMarkAsRead() ? '1' : '0',
			'KeepForward': this.keepForward() ? '1' : '0',
			'SkipOthers': this.actionSkipOthers() ? '1' : '0'
		};
	};

	FilterModel.prototype.addCondition = function ()
	{
		this.conditions.push(new FilterConditionModel());
	};

	FilterModel.prototype.removeCondition = function (oConditionToDelete)
	{
		this.conditions.remove(oConditionToDelete);
		Utils.delegateRunOnDestroy(oConditionToDelete);
	};

	FilterModel.prototype.parse = function (oItem)
	{
		var bResult = false;
		if (oItem && 'Object/Filter' === oItem['@Object'])
		{
			this.id = Utils.pString(oItem['ID']);
			this.name(Utils.pString(oItem['Name']));

			bResult = true;
		}

		return bResult;
	};

	FilterModel.prototype.cloneSelf = function ()
	{
		var oClone = new FilterModel();

		oClone.id = this.id;

		oClone.enabled(this.enabled());

		oClone.name(this.name());
		oClone.name.error(this.name.error());

		oClone.raw(this.raw());

		oClone.conditionsType(this.conditionsType());

		oClone.actionMarkAsRead(this.actionMarkAsRead());
		oClone.actionSkipOthers(this.actionSkipOthers());

		oClone.actionValue(this.actionValue());

		oClone.actionType(this.actionType());

		oClone.keepForward(this.keepForward());

		oClone.conditions(_.map(this.conditions(), function (oCondition) {
			return oCondition.cloneSelf();
		}));

		return oClone;
	};

	module.exports = FilterModel;

}());