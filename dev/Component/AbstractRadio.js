import ko from 'ko';
import { AbstractComponent } from 'Component/Abstract';

class AbstractRadio extends AbstractComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super();

		this.values = ko.observableArray([]);

		this.value = params.value;
		if (undefined === this.value || !this.value.subscribe) {
			this.value = ko.observable('');
		}

		this.inline = undefined === params.inline ? false : params.inline;
		this.readOnly = undefined === params.readOnly ? false : !!params.readOnly;

		if (params.values) {
			this.values(Object.entries(params.values).map((label, value) => ({ label: label, value: value })));
		}

		this.click = this.click.bind(this);
	}

	click(value) {
		if (!this.readOnly && value) {
			this.value(value.value);
		}
	}
}

export { AbstractRadio, AbstractRadio as default };
