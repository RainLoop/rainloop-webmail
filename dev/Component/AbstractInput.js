import ko from 'ko';
import { pInt } from 'Common/Utils';
import { SaveSettingsStep } from 'Common/Enums';
import { koComputable } from 'External/ko';
import { dispose } from 'External/ko';

export class AbstractInput {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		this.value = params.value || '';
		this.label = params.label || '';
		this.enable = null == params.enable ? true : params.enable;
		this.trigger = params.trigger && params.trigger.subscribe ? params.trigger : null;
		this.placeholder = params.placeholder || '';

		this.labeled = null != params.label;

		let size = 0 < params.size ? 'span' + params.size : '';
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

			this.className = koComputable(() =>
				(size + ' settings-saved-trigger-input ' + classForTrigger()).trim()
			);

			this.disposables = [
				this.trigger.subscribe(setTriggerState, this),
				this.className
			];
		} else {
			this.className = size;
			this.disposables = [];
		}
	}

	dispose() {
		this.disposables.forEach(dispose);
	}
}
