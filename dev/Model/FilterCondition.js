import ko from 'ko';

import { AbstractModel } from 'Knoin/AbstractModel';

/**
 * @enum {string}
 */
export const FilterConditionField = {
	From: 'From',
	Recipient: 'Recipient',
	Subject: 'Subject',
	Header: 'Header',
	Body: 'Body',
	Size: 'Size'
};

/**
 * @enum {string}
 */
export const FilterConditionType = {
	Contains: 'Contains',
	NotContains: 'NotContains',
	EqualTo: 'EqualTo',
	NotEqualTo: 'NotEqualTo',
	Regex: 'Regex',
	Over: 'Over',
	Under: 'Under',
	Text: 'Text',
	Raw: 'Raw'
};

export class FilterConditionModel extends AbstractModel {
	constructor() {
		super();

		this.addObservables({
			field: FilterConditionField.From,
			type: FilterConditionType.Contains,
			value: '',
			valueError: false,

			valueSecond: '',
			valueSecondError: false
		});

		this.template = ko.computed(() => {
			let template = '';
			switch (this.field()) {
				case FilterConditionField.Body:
					template = 'SettingsFiltersConditionBody';
					break;
				case FilterConditionField.Size:
					template = 'SettingsFiltersConditionSize';
					break;
				case FilterConditionField.Header:
					template = 'SettingsFiltersConditionMore';
					break;
				default:
					template = 'SettingsFiltersConditionDefault';
					break;
			}

			return template;
		}, this);

		this.addSubscribables({
			field: () => {
				this.value('');
				this.valueSecond('');
			}
		});
	}

	verify() {
		if (!this.value()) {
			this.valueError(true);
			return false;
		}

		if (FilterConditionField.Header === this.field() && !this.valueSecond()) {
			this.valueSecondError(true);
			return false;
		}

		return true;
	}

//	static reviveFromJson(json) {}

	toJson() {
		return {
//			'@Object': 'Object/FilterCondition',
			Field: this.field(),
			Type: this.type(),
			Value: this.value(),
			ValueSecond: this.valueSecond()
		};
	}

	cloneSelf() {
		const filterCond = new FilterConditionModel();

		filterCond.field(this.field());
		filterCond.type(this.type());
		filterCond.value(this.value());
		filterCond.valueSecond(this.valueSecond());

		return filterCond;
	}
}
