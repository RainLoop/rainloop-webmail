
import {_} from 'common';
import ko from 'ko';
import Utils from 'Common/Utils';
import {AbstractComponent} from 'Component/Abstract';

class AbstracRadio extends AbstractComponent
{
	/**
	 * @param {Object} params
	 */
	constructor(params) {

		super();

		this.values = ko.observableArray([]);

		this.value = params.value;
		if (Utils.isUnd(this.value) || !this.value.subscribe)
		{
			this.value = ko.observable('');
		}

		this.inline = Utils.isUnd(params.inline) ? false : params.inline;
		this.readOnly = Utils.isUnd(params.readOnly) ? false : !!params.readOnly;

		if (params.values)
		{
			this.values(_.map(params.values, (label, value) => {
				return {label: label, value: value};
			}));
		}

		this.click = _.bind(this.click, this);
	}

	click(value) {
		if (!this.readOnly && value)
		{
			this.value(value.value);
		}
	}
}

export {AbstracRadio, AbstracRadio as default};
