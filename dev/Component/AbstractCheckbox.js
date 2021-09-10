import ko from 'ko';
import { AbstractComponent } from 'Component/Abstract';

class AbstractCheckbox extends AbstractComponent {
	/**
	 * @param {Object} params = {}
	 */
	constructor(params = {}) {
		super();

		this.value = ko.isObservable(params.value) ? params.value
			: ko.observable(!!params.value);

		this.enable = ko.isObservable(params.enable) ? params.enable
			: ko.observable(undefined === params.enable || !!params.enable);

		this.label = params.label || '';
		this.inline = !!params.inline;

		this.labeled = undefined !== params.label;
	}

	click() {
		this.enable() && this.value(!this.value());
	}
}

export { AbstractCheckbox };
