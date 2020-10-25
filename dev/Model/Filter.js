import ko from 'ko';

import { FilterRulesType, FiltersAction } from 'Common/Enums';
import { pString } from 'Common/Utils';
import { delegateRunOnDestroy } from 'Common/UtilsUser';
import { i18n } from 'Common/Translator';
import { getFolderFromCacheList } from 'Common/Cache';

import AccountStore from 'Stores/User/Account';

import { FilterConditionModel } from 'Model/FilterCondition';
import { AbstractModel } from 'Knoin/AbstractModel';

class FilterModel extends AbstractModel {
	constructor() {
		super();

		this.id = '';

		this.addObservables({
			enabled: true,
			deleteAccess: false,
			canBeDeleted: true,

			name: '',
			nameError: false,
			nameFocused: false,

			conditionsType: FilterRulesType.Any,

			// Actions
			actionValue: '',
			actionValueError: false,

			actionValueSecond: '',
			actionValueThird: '',

			actionValueFourth: '',
			actionValueFourthError: false,

			actionMarkAsRead: false,

			actionKeep: true,
			actionNoStop: false,

			actionType: FiltersAction.MoveTo
		});

		this.conditions = ko.observableArray([]);

		const fGetRealFolderName = (folderFullNameRaw) => {
			const folder = getFolderFromCacheList(folderFullNameRaw);
			return folder ? folder.fullName.replace('.' === folder.delimiter ? /\./ : /[\\/]+/, ' / ') : folderFullNameRaw;
		};

		this.addComputables({
			nameSub: () => {
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
			},

			actionTemplate: () => {
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
			}
		});

		this.addSubscribables({
			name: sValue => this.nameError(!sValue),
			actionValue: sValue => this.actionValueError(!sValue),
			actionType: () => {
				this.actionValue('');
				this.actionValueError(false);
				this.actionValueSecond('');
				this.actionValueThird('');
				this.actionValueFourth('');
				this.actionValueFourthError(false);
			}
		});
	}

	generateID() {
		this.id = Jua.randomId();
	}

	verify() {
		if (!this.name()) {
			this.nameError(true);
			return false;
		}

		if (this.conditions().length && this.conditions().find(cond => cond && !cond.verify())) {
			return false;
		}

		if (!this.actionValue()) {
			if ([
					FiltersAction.MoveTo,
					FiltersAction.Forward,
					FiltersAction.Reject,
					FiltersAction.Vacation
				].includes(this.actionType())
			) {
				this.actionValueError(true);
				return false;
			}
		}

		if (FiltersAction.Forward === this.actionType() && !this.actionValue().includes('@')) {
			this.actionValueError(true);
			return false;
		}

		if (
			FiltersAction.Vacation === this.actionType() &&
			this.actionValueFourth() &&
			!this.actionValueFourth().includes('@')
		) {
			this.actionValueFourthError(true);
			return false;
		}

		this.nameError(false);
		this.actionValueError(false);

		return true;
	}

	toJson() {
		return {
			ID: this.id,
			Enabled: this.enabled() ? '1' : '0',
			Name: this.name(),
			ConditionsType: this.conditionsType(),
			Conditions: this.conditions().map(item => item.toJson()),

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
		this.actionValueFourth(AccountStore.getEmailAddresses().join(', '));
	}

	/**
	 * @static
	 * @param {FetchJsonFilter} json
	 * @returns {?FilterModel}
	 */
	static reviveFromJson(json) {
		const filter = super.reviveFromJson(json);
		if (filter) {
			filter.id = pString(json.ID);

			filter.conditions([]);

			if (Array.isNotEmpty(json.Conditions)) {
				filter.conditions(
					json.Conditions.map(aData => FilterConditionModel.reviveFromJson(aData)).filter(v => v)
				);
			}

			filter.actionNoStop(!json.Stop);
			filter.actionKeep(!!json.Keep);
			filter.actionMarkAsRead(!!json.MarkAsRead);
		}
		return filter;
	}

	cloneSelf() {
		const filter = new FilterModel();

		filter.id = this.id;

		filter.enabled(this.enabled());

		filter.name(this.name());
		filter.nameError(this.nameError());

		filter.conditionsType(this.conditionsType());

		filter.actionMarkAsRead(this.actionMarkAsRead());

		filter.actionType(this.actionType());

		filter.actionValue(this.actionValue());
		filter.actionValueError(this.actionValueError());

		filter.actionValueSecond(this.actionValueSecond());
		filter.actionValueThird(this.actionValueThird());
		filter.actionValueFourth(this.actionValueFourth());

		filter.actionKeep(this.actionKeep());
		filter.actionNoStop(this.actionNoStop());

		filter.conditions(this.conditions().map(item => item.cloneSelf()));

		return filter;
	}
}

export { FilterModel, FilterModel as default };
