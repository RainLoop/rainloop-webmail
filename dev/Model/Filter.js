
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Cache = require('Storage/User/Cache'),

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

		this.conditions = ko.observableArray([]);
		this.conditionsType = ko.observable(Enums.FilterRulesType.Any);

		// Actions
		this.actionValue = ko.observable('');
		this.actionValue.error = ko.observable(false);

		this.actionValueSecond = ko.observable('');

		this.actionMarkAsRead = ko.observable(false);

		this.actionSkipOthers = ko.observable(false);

		this.keepForward = ko.observable(true);

		this.actionType = ko.observable(Enums.FiltersAction.MoveTo);

		this.actionType.subscribe(function () {
			this.actionValue('');
			this.actionValue.error(false);
			this.actionValueSecond('');
		}, this);

		var fGetRealFolderName = function (sFolderFullNameRaw) {
			var oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
			return oFolder ? oFolder.fullName.replace(
				'.' === oFolder.delimiter ? /\./ : /[\\\/]+/, ' / ') : sFolderFullNameRaw;
		};

		this.nameSub = ko.computed(function () {

			var
				sResult = '',
				sActionValue = this.actionValue()
			;

			switch (this.actionType())
			{
				case Enums.FiltersAction.MoveTo:
					sResult = 'MoveTo $i18n "' + fGetRealFolderName(sActionValue) + '"';
					break;
				case Enums.FiltersAction.Forward:
					sResult = 'Forward @i18n "' + sActionValue + '"';
					break;
				case Enums.FiltersAction.Vacation:
					sResult = 'Vacation message @i18n';
					break;
				case Enums.FiltersAction.Discard:
					sResult = 'Discard @i18n';
					break;
			}

			return sResult ? '(' + sResult + ')' : '';

		}, this);

		this.actionTemplate = ko.computed(function () {

			var sTemplate = '';
			switch (this.actionType())
			{
				default:
				case Enums.FiltersAction.MoveTo:
					sTemplate = 'SettingsFiltersActionMoveToFolder';
					break;
				case Enums.FiltersAction.Forward:
					sTemplate = 'SettingsFiltersActionForward';
					break;
				case Enums.FiltersAction.Vacation:
					sTemplate = 'SettingsFiltersActionVacation';
					break;
				case Enums.FiltersAction.None:
					sTemplate = 'SettingsFiltersActionNone';
					break;
				case Enums.FiltersAction.Discard:
					sTemplate = 'SettingsFiltersActionDiscard';
					break;
			}

			return sTemplate;

		}, this);

		this.regDisposables(this.conditions.subscribe(Utils.windowResizeCallback));

		this.regDisposables(this.name.subscribe(function (sValue) {
			this.name.error('' === sValue);
		}, this));

		this.regDisposables(this.actionValue.subscribe(function (sValue) {
			this.actionValue.error('' === sValue);
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

	FilterModel.prototype.verify = function ()
	{
		if ('' === this.name())
		{
			this.name.error(true);
			return false;
		}

		if ('' === this.actionValue())
		{
			if (-1 < Utils.inArray(this.actionType(), [
				Enums.FiltersAction.MoveTo,
				Enums.FiltersAction.Forward,
				Enums.FiltersAction.Vacation
			]))
			{
				this.actionValue.error(true);
				return false;
			}
		}

		if (Enums.FiltersAction.Forward === this.actionType() &&
			-1 === this.actionValue().indexOf('@'))
		{
			this.actionValue.error(true);
			return false;
		}

		this.name.error(false);
		this.actionValue.error(false);

		return true;
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
			'ActionValueSecond': this.actionValueSecond(),
			'ActionType': this.actionType(),

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

		oClone.conditionsType(this.conditionsType());

		oClone.actionMarkAsRead(this.actionMarkAsRead());
		oClone.actionSkipOthers(this.actionSkipOthers());

		oClone.actionType(this.actionType());

		oClone.actionValue(this.actionValue());
		oClone.actionValue.error(this.actionValue.error());

		oClone.actionValueSecond(this.actionValueSecond());

		oClone.keepForward(this.keepForward());

		oClone.conditions(_.map(this.conditions(), function (oCondition) {
			return oCondition.cloneSelf();
		}));

		return oClone;
	};

	module.exports = FilterModel;

}());