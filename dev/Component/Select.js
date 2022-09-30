import { i18n } from 'Common/Translator';
import { pInt } from 'Common/Utils';
import { SaveSettingStatus } from 'Common/Enums';
import { koComputable } from 'External/ko';
import { dispose } from 'External/ko';
import { defaultOptionsAfterRender } from 'Common/Utils';

export class SelectComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		this.value = params.value || '';
		this.label = params.label || '';
		this.enable = null == params.enable ? true : params.enable;
		this.trigger = params.trigger?.subscribe ? params.trigger : null;
		this.placeholder = params.placeholder || '';

		this.labeled = null != params.label;

		let size = 0 < params.size ? 'span' + params.size : '';
		if (this.trigger) {
			const
				classForTrigger = ko.observable(''),
				setTriggerState = value => {
					switch (pInt(value)) {
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
			this.disposables = [];
		}

		this.options = params.options || '';

		this.optionsText = params.optionsText || null;
		this.optionsValue = params.optionsValue || null;
		this.optionsCaption = i18n(params.optionsCaption || null);

		this.defaultOptionsAfterRender = defaultOptionsAfterRender;
	}

	dispose() {
		this.disposables.forEach(dispose);
	}
}
