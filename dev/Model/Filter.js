
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

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

		this.actionKeep = ko.observable(true);

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
					sResult = Translator.i18n('SETTINGS_FILTERS/SUBNAME_MOVE_TO', {
						'FOLDER': fGetRealFolderName(sActionValue)
					});
					break;
				case Enums.FiltersAction.Forward:
					sResult = Translator.i18n('SETTINGS_FILTERS/SUBNAME_FORWARD_TO', {
						'EMAIL': sActionValue
					});
					break;
				case Enums.FiltersAction.Vacation:
					sResult = Translator.i18n('SETTINGS_FILTERS/SUBNAME_VACATION_MESSAGE');
					break;
				case Enums.FiltersAction.Reject:
					sResult = Translator.i18n('SETTINGS_FILTERS/SUBNAME_REJECT');
					break;
				case Enums.FiltersAction.Discard:
					sResult = Translator.i18n('SETTINGS_FILTERS/SUBNAME_DISCARD');
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
				case Enums.FiltersAction.Reject:
					sTemplate = 'SettingsFiltersActionReject';
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

		if (0 < this.conditions().length)
		{
			if (_.find(this.conditions(), function (oCond) {
				return oCond && !oCond.verify();
			}))
			{
				return false;
			}
		}

		if ('' === this.actionValue())
		{
			if (-1 < Utils.inArray(this.actionType(), [
				Enums.FiltersAction.MoveTo,
				Enums.FiltersAction.Forward,
				Enums.FiltersAction.Reject,
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

			'Keep': this.actionKeep() ? '1' : '0',
			'MarkAsRead': this.actionMarkAsRead() ? '1' : '0',
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
			this.enabled(!!oItem['Enabled']);

			this.conditionsType(Utils.pString(oItem['ConditionsType']));

			this.conditions([]);

			if (Utils.isNonEmptyArray(oItem['Conditions']))
			{
				this.conditions(_.compact(_.map(oItem['Conditions'], function (aData) {
					var oFilterCondition = new FilterConditionModel();
					return oFilterCondition && oFilterCondition.parse(aData) ?
						oFilterCondition : null;
				})));
			}

			this.actionType(Utils.pString(oItem['ActionType']));

			this.actionValue(Utils.pString(oItem['ActionValue']));
			this.actionValueSecond(Utils.pString(oItem['ActionValueSecond']));

			this.actionKeep(!!oItem['Keep']);
			this.actionMarkAsRead(!!oItem['MarkAsRead']);
			this.actionSkipOthers(!!oItem['SkipOthers']);

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

		oClone.actionKeep(this.actionKeep());

		oClone.conditions(_.map(this.conditions(), function (oCondition) {
			return oCondition.cloneSelf();
		}));

		return oClone;
	};

	module.exports = FilterModel;

}());