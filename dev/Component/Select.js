import { SaveSettingStatus } from 'Common/Enums';
import { dispose, koComputable } from 'External/ko';
import { defaultOptionsAfterRender } from 'Common/Utils';

export class SelectComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		this.value = params.value;
		this.label = params.label;
		this.trigger = params.trigger?.subscribe ? params.trigger : null;
		this.placeholder = params.placeholder;
		this.options = params.options;
		this.optionsText = params.optionsText;
		this.optionsValue = params.optionsValue;

		let size = 0 < params.size ? 'span' + params.size : '';
		if (this.trigger) {
			const
				classForTrigger = ko.observable(''),
				setTriggerState = value => {
					switch (value) {
						case SaveSettingStatus.Success:
							classForTrigger('success');
							break;
						case SaveSettingStatus.Failed:
							classForTrigger('error');
							break;
						default:
							classForTrigger('');
							break;
					}
				};

			setTriggerState(this.trigger());

			this.className = koComputable(() =>
				(size + ' settings-save-trigger-input ' + classForTrigger()).trim()
			);

			this.disposables = [
				this.trigger.subscribe(setTriggerState, this),
				this.className
			];
		} else {
			this.className = size;
		}

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
	}

	dispose() {
		this.disposables?.forEach(dispose);
	}
}
