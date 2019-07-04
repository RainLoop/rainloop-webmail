import ko from 'ko';
import { isUnd, trim, pInt } from 'Common/Utils';
import { SaveSettingsStep } from 'Common/Enums';
import { AbstractComponent } from 'Component/Abstract';

class AbstractInput extends AbstractComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super();

		this.value = params.value || '';
		this.size = params.size || 0;
		this.label = params.label || '';
		this.preLabel = params.preLabel || '';
		this.enable = isUnd(params.enable) ? true : params.enable;
		this.trigger = params.trigger && params.trigger.subscribe ? params.trigger : null;
		this.placeholder = params.placeholder || '';

		this.labeled = !isUnd(params.label);
		this.preLabeled = !isUnd(params.preLabel);
		this.triggered = !isUnd(params.trigger) && !!this.trigger;

		this.classForTrigger = ko.observable('');

		this.className = ko.computed(() => {
			const size = ko.unwrap(this.size),
				suffixValue = this.trigger ? ' ' + trim('settings-saved-trigger-input ' + this.classForTrigger()) : '';
			return (0 < size ? 'span' + size : '') + suffixValue;
		});

		if (!isUnd(params.width) && params.element) {
			params.element.find('input,select,textarea').css('width', params.width);
		}

		this.disposable.push(this.className);

		if (this.trigger) {
			this.setTriggerState(this.trigger());

			this.disposable.push(this.trigger.subscribe(this.setTriggerState, this));
		}
	}

	setTriggerState(value) {
		switch (pInt(value)) {
			case SaveSettingsStep.TrueResult:
				this.classForTrigger('success');
				break;
			case SaveSettingsStep.FalseResult:
				this.classForTrigger('error');
				break;
			default:
				this.classForTrigger('');
				break;
		}
	}
}

export { AbstractInput, AbstractInput as default };
