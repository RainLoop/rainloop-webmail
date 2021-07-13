import ko from 'ko';
import { AbstractComponent } from 'Component/Abstract';

class AbstractCheckbox extends AbstractComponent {
	/**
	 * @param {Object} params = {}
	 */
	constructor(params = {}) {
		super();

		this.value = params.value;
		if (undefined === this.value || !this.value.subscribe) {
			this.value = ko.observable(!!this.value);
		}

		this.enable = params.enable;
		if (undefined === this.enable || !this.enable.subscribe) {
			this.enable = ko.observable(undefined === this.enable || !!this.enable);
		}

		this.disable = params.disable;
		if (undefined === this.disable || !this.disable.subscribe) {
			this.disable = ko.observable(!!this.disable);
		}

		this.label = params.label || '';
		this.inline = !!params.inline;

		this.labeled = undefined !== params.label;
	}

	click() {
		if (this.enable() && !this.disable()) {
			this.value(!this.value());
		}
	}
}

export { AbstractCheckbox };
