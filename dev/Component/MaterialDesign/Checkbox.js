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

		this.animationBoxSetTrue = this.animationBoxSetTrue.bind(this);
		this.animationCheckmarkSetTrue = this.animationCheckmarkSetTrue.bind(this);

		this.disposable.push(
			this.value.subscribe((value) => {
				this.triggerAnimation(value);
			}, this)
		);
	}

	animationBoxSetTrue() {
		this.animationBox(true);
	}

	animationCheckmarkSetTrue() {
		this.animationCheckmark(true);
	}

	triggerAnimation(box) {
		if (box) {
			this.animationBoxSetTrue();
			setTimeout(this.animationCheckmarkSetTrue, 200);
		} else {
			this.animationCheckmarkSetTrue();
			setTimeout(this.animationBoxSetTrue, 200);
		}
	}
}
