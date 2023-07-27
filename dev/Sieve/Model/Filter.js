import { koArrayWithDestroy } from 'Sieve/Utils';

//import { getFolderFromCacheList } from 'Common/Cache';

//import { AccountUserStore } from 'Stores/User/Account';

import { FilterConditionModel } from 'Sieve/Model/FilterCondition';
import { AbstractModel } from 'Sieve/Model/Abstract';

/**
 * @enum {string}
 */
export const FilterAction = {
	None: 'None',
	MoveTo: 'MoveTo',
	Discard: 'Discard',
	Vacation: 'Vacation',
	Reject: 'Reject',
	Forward: 'Forward'
};

/**
 * @enum {string}
 */
const FilterRulesType = {
	All: 'All',
	Any: 'Any'
};

export class FilterModel extends AbstractModel {
	constructor() {
		super();

		this.id = '';

		this.addObservables({
			enabled: true,
			askDelete: false,
			canBeDeleted: true,

			name: '',
			nameError: false,

			conditionsType: FilterRulesType.Any,

			// Actions
			actionValue: '',
			actionValueError: false,

			actionValueSecond: '',
			actionValueThird: '',

			actionValueFourth: '',
			actionValueFourthError: false,

			markAsRead: false,

			keep: true,
			stop: true,

			actionType: FilterAction.MoveTo
		});

		this.conditions = koArrayWithDestroy();

		const fGetRealFolderName = folderFullName => {
//			const folder = getFolderFromCacheList(folderFullName);
//			return folder?.fullName.replace('.' === folder.delimiter ? /\./ : /[\\/]+/, ' / ') : folderFullName;
			return folderFullName;
		};

		this.addComputables({
			nameSub: () => {
				let result = '';
				const actionValue = this.actionValue(), root = 'SETTINGS_FILTERS/SUBNAME_';

				switch (this.actionType()) {
					case FilterAction.MoveTo:
						result = rl.i18n(root + 'MOVE_TO', {
							FOLDER: fGetRealFolderName(actionValue)
						});
						break;
					case FilterAction.Forward:
						result = rl.i18n(root + 'FORWARD_TO', {
							EMAIL: actionValue
						});
						break;
					case FilterAction.Vacation:
						result = rl.i18n(root + 'VACATION_MESSAGE');
						break;
					case FilterAction.Reject:
						result = rl.i18n(root + 'REJECT');
						break;
					case FilterAction.Discard:
						result = rl.i18n(root + 'DISCARD');
						break;
					// no default
				}

				return result ? '(' + result + ')' : '';
			},

			actionTemplate: () => {
				const result = 'SettingsFiltersAction';
				switch (this.actionType()) {
					case FilterAction.Forward:
						return result + 'Forward';
					case FilterAction.Vacation:
						return result + 'Vacation';
					case FilterAction.Reject:
						return result + 'Reject';
					case FilterAction.None:
						return result + 'None';
					case FilterAction.Discard:
						return result + 'Discard';
					case FilterAction.MoveTo:
					default:
						return result + 'MoveToFolder';
				}
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

		if (this.conditions.length && this.conditions.find(cond => cond && !cond.verify())) {
			return false;
		}

		if (!this.actionValue()) {
			if ([
					FilterAction.MoveTo,
					FilterAction.Forward,
					FilterAction.Reject,
					FilterAction.Vacation
				].includes(this.actionType())
			) {
				this.actionValueError(true);
				return false;
			}
		}

		if (FilterAction.Forward === this.actionType() && !this.actionValue().includes('@')) {
			this.actionValueError(true);
			return false;
		}

		if (
			FilterAction.Vacation === this.actionType() &&
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

	toJSON() {
		return {
//			'@Object': 'Object/Filter',
			ID: this.id,
			Enabled: this.enabled() ? 1 : 0,
			Name: this.name,
			Conditions: this.conditions,
			ConditionsType: this.conditionsType,

			ActionType: this.actionType(),
			ActionValue: this.actionValue,
			ActionValueSecond: this.actionValueSecond,
			ActionValueThird: this.actionValueThird,
			ActionValueFourth: this.actionValueFourth,

			Keep: this.keep() ? 1 : 0,
			Stop: this.stop() ? 1 : 0,
			MarkAsRead: this.markAsRead() ? 1 : 0
		};
	}

	addCondition() {
		this.conditions.push(new FilterConditionModel());
	}

	removeCondition(oConditionToDelete) {
		this.conditions.remove(oConditionToDelete);
	}

	/**
	 * @static
	 * @param {FetchJsonFilter} json
	 * @returns {?FilterModel}
	 */
	static reviveFromJson(json) {
		json.id = json.ID;
		delete json.ID;
		const filter = super.reviveFromJson(json);
		if (filter) {
			filter.id = '' + (filter.id || '');
			filter.conditions(
				(json.Conditions || []).map(aData => FilterConditionModel.reviveFromJson(aData)).filter(v => v)
			);
		}
		return filter;
	}

	assignTo(target) {
		const filter = target || new FilterModel();

		filter.id = this.id;

		filter.enabled(this.enabled());

		filter.name(this.name());
		filter.nameError(this.nameError());

		filter.conditionsType(this.conditionsType());

		filter.markAsRead(this.markAsRead());

		filter.actionType(this.actionType());

		filter.actionValue(this.actionValue());
		filter.actionValueError(this.actionValueError());

		filter.actionValueSecond(this.actionValueSecond());
		filter.actionValueThird(this.actionValueThird());
		filter.actionValueFourth(this.actionValueFourth());

		filter.keep(this.keep());
		filter.stop(this.stop());

		filter.conditions(this.conditions.map(item => item.cloneSelf()));

		return filter;
	}
}
