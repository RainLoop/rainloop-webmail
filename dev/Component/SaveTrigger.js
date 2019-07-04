import { pInt } from 'Common/Utils';
import { SaveSettingsStep } from 'Common/Enums';
import { AbstractComponent, componentExportHelper } from 'Component/Abstract';

class SaveTriggerComponent extends AbstractComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super();

		this.element = params.element || null;
		this.value = params.value && params.value.subscribe ? params.value : null;

		if (this.element) {
			if (this.value) {
				this.element.css('display', 'inline-block');

				if (params.verticalAlign) {
					this.element.css('vertical-align', params.verticalAlign);
				}

				this.setState(this.value());

				this.disposable.push(this.value.subscribe(this.setState, this));
			} else {
				this.element.hide();
			}
		}
	}

	setState(value) {
		switch (pInt(value)) {
			case SaveSettingsStep.TrueResult:
				this.element
					.find('.animated,.error')
					.hide()
					.removeClass('visible')
					.end()
					.find('.success')
					.show()
					.addClass('visible');
				break;
			case SaveSettingsStep.FalseResult:
				this.element
					.find('.animated,.success')
					.hide()
					.removeClass('visible')
					.end()
					.find('.error')
					.show()
					.addClass('visible');
				break;
			case SaveSettingsStep.Animate:
				this.element
					.find('.error,.success')
					.hide()
					.removeClass('visible')
					.end()
					.find('.animated')
					.show()
					.addClass('visible');
				break;
			case SaveSettingsStep.Idle:
			default:
				this.element
					.find('.animated')
					.hide()
					.end()
					.find('.error,.success')
					.removeClass('visible');
				break;
		}
	}
}

export default componentExportHelper(SaveTriggerComponent, 'SaveTriggerComponent');
