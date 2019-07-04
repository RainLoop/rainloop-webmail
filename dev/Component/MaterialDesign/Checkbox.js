import _ from '_';
import ko from 'ko';
import { componentExportHelper } from 'Component/Abstract';
import { AbstractCheckbox } from 'Component/AbstractCheckbox';

class CheckboxMaterialDesignComponent extends AbstractCheckbox {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super(params);

		this.animationBox = ko.observable(false).extend({ falseTimeout: 200 });
		this.animationCheckmark = ko.observable(false).extend({ falseTimeout: 200 });

		this.animationBoxSetTrue = _.bind(this.animationBoxSetTrue, this);
		this.animationCheckmarkSetTrue = _.bind(this.animationCheckmarkSetTrue, this);

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
			_.delay(this.animationCheckmarkSetTrue, 200);
		} else {
			this.animationCheckmarkSetTrue();
			_.delay(this.animationBoxSetTrue, 200);
		}
	}
}

export default componentExportHelper(CheckboxMaterialDesignComponent, 'CheckboxMaterialDesignComponent');
