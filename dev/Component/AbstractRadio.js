import _ from '_';
import ko from 'ko';
import { isUnd } from 'Common/Utils';
import { AbstractComponent } from 'Component/Abstract';

class AbstractRadio extends AbstractComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super();

		this.values = ko.observableArray([]);

		this.value = params.value;
		if (isUnd(this.value) || !this.value.subscribe) {
			this.value = ko.observable('');
		}

		this.inline = isUnd(params.inline) ? false : params.inline;
		this.readOnly = isUnd(params.readOnly) ? false : !!params.readOnly;

		if (params.values) {
			this.values(_.map(params.values, (label, value) => ({ label: label, value: value })));
		}

		this.click = _.bind(this.click, this);
	}

	click(value) {
		if (!this.readOnly && value) {
			this.value(value.value);
		}
	}
}

export { AbstractRadio, AbstractRadio as default };
