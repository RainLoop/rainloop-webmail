
import ko from 'ko';
import Utils from 'Common/Utils';
import {AbstractComponent} from 'Component/Abstract';

class AbstracCheckbox extends AbstractComponent
{
	/**
	 * @param {Object} params = {}
	 */
	constructor(params = {}) {

		super();

		this.value = params.value;
		if (Utils.isUnd(this.value) || !this.value.subscribe)
		{
			this.value = ko.observable(Utils.isUnd(this.value) ? false : !!this.value);
		}

		this.enable = params.enable;
		if (Utils.isUnd(this.enable) || !this.enable.subscribe)
		{
			this.enable = ko.observable(Utils.isUnd(this.enable) ? true : !!this.enable);
		}

		this.disable = params.disable;
		if (Utils.isUnd(this.disable) || !this.disable.subscribe)
		{
			this.disable = ko.observable(Utils.isUnd(this.disable) ? false : !!this.disable);
		}

		this.label = params.label || '';
		this.inline = Utils.isUnd(params.inline) ? false : params.inline;

		this.readOnly = Utils.isUnd(params.readOnly) ? false : !!params.readOnly;
		this.inverted = Utils.isUnd(params.inverted) ? false : !!params.inverted;

		this.labeled = !Utils.isUnd(params.label);
		this.labelAnimated = !!params.labelAnimated;
	}

	click() {
		if (!this.readOnly && this.enable() && !this.disable())
		{
			this.value(!this.value());
		}
	}
}

export {AbstracCheckbox, AbstracCheckbox as default};
