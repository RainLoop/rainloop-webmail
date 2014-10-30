
(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		AbstractComponent = require('Component/Abstract')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstractComponent
	 */
	function SaveTriggerComponent(oParams)
	{
		AbstractComponent.call(this);

		this.element = oParams.element || null;
		this.value = oParams.value && oParams.value.subscribe ? oParams.value : null;

		if (this.element)
		{
			if (this.value)
			{
				this.element.css('display', 'inline-block');

				if (oParams.verticalAlign)
				{
					this.element.css('vertical-align', oParams.verticalAlign);
				}

				this.setState(this.value());

				this.disposable.push(
					this.value.subscribe(this.setState, this)
				);
			}
			else
			{
				this.element.hide();
			}
		}
	}

	SaveTriggerComponent.prototype.setState = function (nValue)
	{
		switch (Utils.pInt(nValue))
		{
			case Enums.SaveSettingsStep.TrueResult:
				this.element
					.find('.animated,.error').hide().removeClass('visible')
					.end()
					.find('.success').show().addClass('visible')
				;
				break;
			case Enums.SaveSettingsStep.FalseResult:
				this.element
					.find('.animated,.success').hide().removeClass('visible')
					.end()
					.find('.error').show().addClass('visible')
				;
				break;
			case Enums.SaveSettingsStep.Animate:
				this.element
					.find('.error,.success').hide().removeClass('visible')
					.end()
					.find('.animated').show().addClass('visible')
				;
				break;
			default:
			case Enums.SaveSettingsStep.Idle:
				this.element
					.find('.animated').hide()
					.end()
					.find('.error,.success').removeClass('visible')
				;
				break;
		}
	};

	_.extend(SaveTriggerComponent.prototype, AbstractComponent.prototype);

	module.exports = AbstractComponent.componentExportHelper(
		SaveTriggerComponent, 'SaveTriggerComponent');

}());
