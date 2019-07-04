import _ from '_';
import ko from 'ko';

import { FilterRulesType, FiltersAction } from 'Common/Enums';
import { pString, inArray, isNonEmptyArray, fakeMd5, delegateRunOnDestroy, windowResizeCallback } from 'Common/Utils';
import { i18n } from 'Common/Translator';
import { getFolderFromCacheList } from 'Common/Cache';

import AccountStore from 'Stores/User/Account';

import { FilterConditionModel } from 'Model/FilterCondition';
import { AbstractModel } from 'Knoin/AbstractModel';

class FilterModel extends AbstractModel {
	constructor() {
		super('FilterModel');

		this.enabled = ko.observable(true);

		this.id = '';

		this.name = ko.observable('');
		this.name.error = ko.observable(false);
		this.name.focused = ko.observable(false);

		this.conditions = ko.observableArray([]);
		this.conditionsType = ko.observable(FilterRulesType.Any);

		// Actions
		this.actionValue = ko.observable('');
		this.actionValue.error = ko.observable(false);

		this.actionValueSecond = ko.observable('');
		this.actionValueThird = ko.observable('');

		this.actionValueFourth = ko.observable('');
		this.actionValueFourth.error = ko.observable(false);

		this.actionMarkAsRead = ko.observable(false);

		this.actionKeep = ko.observable(true);
		this.actionNoStop = ko.observable(false);

		this.actionType = ko.observable(FiltersAction.MoveTo);

		this.actionType.subscribe(() => {
			this.actionValue('');
			this.actionValue.error(false);
			this.actionValueSecond('');
			this.actionValueThird('');
			this.actionValueFourth('');
			this.actionValueFourth.error(false);
		});

		const fGetRealFolderName = (folderFullNameRaw) => {
			const folder = getFolderFromCacheList(folderFullNameRaw);
			return folder ? folder.fullName.replace('.' === folder.delimiter ? /\./ : /[\\/]+/, ' / ') : folderFullNameRaw;
		};

		this.nameSub = ko.computed(() => {
			let result = '';
			const actionValue = this.actionValue();

			switch (this.actionType()) {
				case FiltersAction.MoveTo:
					result = i18n('SETTINGS_FILTERS/SUBNAME_MOVE_TO', {
						FOLDER: fGetRealFolderName(actionValue)
					});
					break;
				case FiltersAction.Forward:
					result = i18n('SETTINGS_FILTERS/SUBNAME_FORWARD_TO', {
						EMAIL: actionValue
					});
					break;
				case FiltersAction.Vacation:
					result = i18n('SETTINGS_FILTERS/SUBNAME_VACATION_MESSAGE');
					break;
				case FiltersAction.Reject:
					result = i18n('SETTINGS_FILTERS/SUBNAME_REJECT');
					break;
				case FiltersAction.Discard:
					result = i18n('SETTINGS_FILTERS/SUBNAME_DISCARD');
					break;
				// no default
			}

			return result ? '(' + result + ')' : '';
		});

		this.actionTemplate = ko.computed(() => {
			let result = '';

			switch (this.actionType()) {
				case FiltersAction.Forward:
					result = 'SettingsFiltersActionForward';
					break;
				case FiltersAction.Vacation:
					result = 'SettingsFiltersActionVacation';
					break;
				case FiltersAction.Reject:
					result = 'SettingsFiltersActionReject';
					break;
				case FiltersAction.None:
					result = 'SettingsFiltersActionNone';
					break;
				case FiltersAction.Discard:
					result = 'SettingsFiltersActionDiscard';
					break;
				case FiltersAction.MoveTo:
				default:
					result = 'SettingsFiltersActionMoveToFolder';
					break;
			}

			return result;
		});

		this.regDisposables(this.conditions.subscribe(windowResizeCallback));

		this.regDisposables(
			this.name.subscribe((sValue) => {
				this.name.error('' === sValue);
			})
		);

		this.regDisposables(
			this.actionValue.subscribe((sValue) => {
				this.actionValue.error('' === sValue);
			})
		);

		this.regDisposables([this.actionNoStop, this.actionTemplate]);

		this.deleteAccess = ko.observable(false);
		this.canBeDeleted = ko.observable(true);
	}

	generateID() {
		this.id = fakeMd5();
	}

	verify() {
		if ('' === this.name()) {
			this.name.error(true);
			return false;
		}

		if (0 < this.conditions().length) {
			if (_.find(this.conditions(), (cond) => cond && !cond.verify())) {
				return false;
			}
		}

		if ('' === this.actionValue()) {
			if (
				-1 <
				inArray(this.actionType(), [
					FiltersAction.MoveTo,
					FiltersAction.Forward,
					FiltersAction.Reject,
					FiltersAction.Vacation
				])
			) {
				this.actionValue.error(true);
				return false;
			}
		}

		if (FiltersAction.Forward === this.actionType() && -1 === this.actionValue().indexOf('@')) {
			this.actionValue.error(true);
			return false;
		}

		if (
			FiltersAction.Vacation === this.actionType() &&
			'' !== this.actionValueFourth() &&
			-1 === this.actionValueFourth().indexOf('@')
		) {
			this.actionValueFourth.error(true);
			return false;
		}

		this.name.error(false);
		this.actionValue.error(false);

		return true;
	}

	toJson() {
		return {
			ID: this.id,
			Enabled: this.enabled() ? '1' : '0',
			Name: this.name(),
			ConditionsType: this.conditionsType(),
			Conditions: _.map(this.conditions(), (item) => item.toJson()),

			ActionValue: this.actionValue(),
			ActionValueSecond: this.actionValueSecond(),
			ActionValueThird: this.actionValueThird(),
			ActionValueFourth: this.actionValueFourth(),
			ActionType: this.actionType(),

			Stop: this.actionNoStop() ? '0' : '1',
			Keep: this.actionKeep() ? '1' : '0',
			MarkAsRead: this.actionMarkAsRead() ? '1' : '0'
		};
	}

	addCondition() {
		this.conditions.push(new FilterConditionModel());
	}

	removeCondition(oConditionToDelete) {
		this.conditions.remove(oConditionToDelete);
		delegateRunOnDestroy(oConditionToDelete);
	}

	setRecipients() {
		this.actionValueFourth(AccountStore.accountsEmails().join(', '));
	}

	parse(json) {
		let result = false;
		if (json && 'Object/Filter' === json['@Object']) {
			this.id = pString(json.ID);
			this.name(pString(json.Name));
			this.enabled(!!json.Enabled);

			this.conditionsType(pString(json.ConditionsType));

			this.conditions([]);

			if (isNonEmptyArray(json.Conditions)) {
				this.conditions(
					_.compact(
						_.map(json.Conditions, (aData) => {
							const filterCondition = new FilterConditionModel();
							return filterCondition && filterCondition.parse(aData) ? filterCondition : null;
						})
					)
				);
			}

			this.actionType(pString(json.ActionType));

			this.actionValue(pString(json.ActionValue));
			this.actionValueSecond(pString(json.ActionValueSecond));
			this.actionValueThird(pString(json.ActionValueThird));
			this.actionValueFourth(pString(json.ActionValueFourth));

			this.actionNoStop(!json.Stop);
			this.actionKeep(!!json.Keep);
			this.actionMarkAsRead(!!json.MarkAsRead);

			result = true;
		}

		return result;
	}

	cloneSelf() {
		const filter = new FilterModel();

		filter.id = this.id;

		filter.enabled(this.enabled());

		filter.name(this.name());
		filter.name.error(this.name.error());

		filter.conditionsType(this.conditionsType());

		filter.actionMarkAsRead(this.actionMarkAsRead());

		filter.actionType(this.actionType());

		filter.actionValue(this.actionValue());
		filter.actionValue.error(this.actionValue.error());

		filter.actionValueSecond(this.actionValueSecond());
		filter.actionValueThird(this.actionValueThird());
		filter.actionValueFourth(this.actionValueFourth());

		filter.actionKeep(this.actionKeep());
		filter.actionNoStop(this.actionNoStop());

		filter.conditions(_.map(this.conditions(), (item) => item.cloneSelf()));

		return filter;
	}
}

export { FilterModel, FilterModel as default };
