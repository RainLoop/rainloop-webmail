import { SaveSettingsStep } from 'Common/Enums';
import { AbstractComponent } from 'Component/Abstract';

export class SaveTriggerComponent extends AbstractComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super();

		const el = params.element;
		this.element = el || null;
		this.value = params.value && params.value.subscribe ? params.value : null;

		if (el) {
			if (this.value) {
				el.style.display = 'inline-block';

				if (params.verticalAlign) {
					el.style.verticalAlign = params.verticalAlign;
				}

				this.setState(this.value());

				this.disposable.push(this.value.subscribe(this.setState, this));
			} else {
				el.style.display = 'none';
			}
		}
	}

	setState(value) {
		value = parseInt(value,10);
		this.element.querySelector('.animated').hidden = value !== SaveSettingsStep.Animate;
		this.element.querySelector('.success').hidden = value !== SaveSettingsStep.TrueResult;
		this.element.querySelector('.error').hidden = value !== SaveSettingsStep.FalseResult;
	}
}
