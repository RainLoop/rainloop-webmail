
import ko from 'ko';

import {FilterConditionField, FilterConditionType} from 'Common/Enums';
import {pString} from 'Common/Utils';

import {AbstractModel} from 'Knoin/AbstractModel';

class FilterConditionModel extends AbstractModel
{
	constructor()
	{
		super('FilterConditionModel');

		this.field = ko.observable(FilterConditionField.From);
		this.type = ko.observable(FilterConditionType.Contains);
		this.value = ko.observable('');
		this.value.error = ko.observable(false);

		this.valueSecond = ko.observable('');
		this.valueSecond.error = ko.observable(false);

		this.template = ko.computed(function() {

			var sTemplate = '';
			switch (this.field())
			{
				case FilterConditionField.Size:
					sTemplate = 'SettingsFiltersConditionSize';
					break;
				case FilterConditionField.Header:
					sTemplate = 'SettingsFiltersConditionMore';
					break;
				default:
					sTemplate = 'SettingsFiltersConditionDefault';
					break;
			}

			return sTemplate;

		}, this);

		this.field.subscribe(function() {
			this.value('');
			this.valueSecond('');
		}, this);

		this.regDisposables([this.template]);
	}

	verify() {
		if ('' === this.value())
		{
			this.value.error(true);
			return false;
		}

		if (FilterConditionField.Header === this.field() && '' === this.valueSecond())
		{
			this.valueSecond.error(true);
			return false;
		}

		return true;
	}

	parse(json) {
		if (json && json.Field && json.Type)
		{
			this.field(pString(json.Field));
			this.type(pString(json.Type));
			this.value(pString(json.Value));
			this.valueSecond(pString(json.ValueSecond));

			return true;
		}

		return false;
	}

	toJson() {
		return {
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

export {FilterConditionModel, FilterConditionModel as default};
