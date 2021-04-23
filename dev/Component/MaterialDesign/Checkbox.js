import ko from 'ko';
import { AbstractCheckbox } from 'Component/AbstractCheckbox';

export class CheckboxMaterialDesignComponent extends AbstractCheckbox {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super(params);

		this.animationBox = ko.observable(false).extend({ falseTimeout: 200 });
		this.animationCheckmark = ko.observable(false).extend({ falseTimeout: 200 });

		this.disposable.push(
			this.value.subscribe(value => this.triggerAnimation(value), this)
		);
	}

	triggerAnimation(box) {
		if (box) {
			this.animationBox(true);
			setTimeout(()=>this.animationCheckmark(true), 200);
		} else {
			this.animationCheckmark(true);
			setTimeout(()=>this.animationBox(true), 200);
		}
	}
}
