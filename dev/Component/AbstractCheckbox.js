import ko from 'ko';
import { isUnd } from 'Common/Utils';
import { AbstractComponent } from 'Component/Abstract';

class AbstractCheckbox extends AbstractComponent {
	/**
	 * @param {Object} params = {}
	 */
	constructor(params = {}) {
		super();

		this.value = params.value;
		if (isUnd(this.value) || !this.value.subscribe) {
			this.value = ko.observable(isUnd(this.value) ? false : !!this.value);
		}

		this.enable = params.enable;
		if (isUnd(this.enable) || !this.enable.subscribe) {
			this.enable = ko.observable(isUnd(this.enable) ? true : !!this.enable);
		}

		this.disable = params.disable;
		if (isUnd(this.disable) || !this.disable.subscribe) {
			this.disable = ko.observable(isUnd(this.disable) ? false : !!this.disable);
		}

		this.label = params.label || '';
		this.inline = isUnd(params.inline) ? false : params.inline;

		this.readOnly = isUnd(params.readOnly) ? false : !!params.readOnly;
		this.inverted = isUnd(params.inverted) ? false : !!params.inverted;

		this.labeled = !isUnd(params.label);
		this.labelAnimated = !!params.labelAnimated;
	}

	click() {
		if (!this.readOnly && this.enable() && !this.disable()) {
			this.value(!this.value());
		}
	}
}

export { AbstractCheckbox, AbstractCheckbox as default };
