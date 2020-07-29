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
			this.value = ko.observable(undefined === this.value ? false : !!this.value);
		}

		this.enable = params.enable;
		if (undefined === this.enable || !this.enable.subscribe) {
			this.enable = ko.observable(undefined === this.enable ? true : !!this.enable);
		}

		this.disable = params.disable;
		if (undefined === this.disable || !this.disable.subscribe) {
			this.disable = ko.observable(undefined === this.disable ? false : !!this.disable);
		}

		this.label = params.label || '';
		this.inline = undefined === params.inline ? false : params.inline;

		this.readOnly = undefined === params.readOnly ? false : !!params.readOnly;
		this.inverted = undefined === params.inverted ? false : !!params.inverted;

		this.labeled = undefined !== params.label;
		this.labelAnimated = !!params.labelAnimated;
	}

	click() {
		if (!this.readOnly && this.enable() && !this.disable()) {
			this.value(!this.value());
		}
	}
}

export { AbstractCheckbox, AbstractCheckbox as default };
