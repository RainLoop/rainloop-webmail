import ko from 'ko';
import { pInt } from 'Common/Utils';
import { SaveSettingsStep } from 'Common/Enums';
import { AbstractComponent } from 'Component/Abstract';

class AbstractInput extends AbstractComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super();

		this.value = params.value || '';
		this.label = params.label || '';
		this.enable = null == params.enable ? true : params.enable;
		this.trigger = params.trigger && params.trigger.subscribe ? params.trigger : null;
		this.placeholder = params.placeholder || '';

		this.labeled = null != params.label;

		let size = params.size || 0;
		if (this.trigger) {
			const
				classForTrigger = ko.observable(''),
				setTriggerState = value => {
					switch (pInt(value)) {
						case SaveSettingsStep.TrueResult:
							classForTrigger('success');
							break;
						case SaveSettingsStep.FalseResult:
							classForTrigger('error');
							break;
						default:
							classForTrigger('');
							break;
					}
				};

			setTriggerState(this.trigger());

			this.className = ko.computed(() =>
				((0 < size ? 'span' + size : '') + ' settings-saved-trigger-input ' + classForTrigger()).trim()
			);

			this.disposable.push(this.trigger.subscribe(setTriggerState, this));
		} else {
			this.className = ko.computed(() => 0 < size ? 'span' + size : '');
		}

		this.disposable.push(this.className);
	}
}

export { AbstractInput };
