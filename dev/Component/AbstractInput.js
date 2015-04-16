
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

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
	function AbstractInput(oParams)
	{
		AbstractComponent.call(this);

		this.value = oParams.value || '';
		this.size = oParams.size || 0;
		this.label = oParams.label || '';
		this.preLabel = oParams.preLabel || '';
		this.enable = Utils.isUnd(oParams.enable) ? true : oParams.enable;
		this.trigger = oParams.trigger && oParams.trigger.subscribe ? oParams.trigger : null;
		this.placeholder = oParams.placeholder || '';

		this.labeled = !Utils.isUnd(oParams.label);
		this.preLabeled = !Utils.isUnd(oParams.preLabel);
		this.triggered = !Utils.isUnd(oParams.trigger) && !!this.trigger;

		this.classForTrigger = ko.observable('');

		this.className = ko.computed(function () {

			var
				iSize = ko.unwrap(this.size),
				sSuffixValue = this.trigger ?
					' ' + Utils.trim('settings-saved-trigger-input ' + this.classForTrigger()) : ''
			;

			return (0 < iSize ? 'span' + iSize : '') + sSuffixValue;

		}, this);

		if (!Utils.isUnd(oParams.width) && oParams.element)
		{
			oParams.element.find('input,select,textarea').css('width', oParams.width);
		}

		this.disposable.push(this.className);

		if (this.trigger)
		{
			this.setTriggerState(this.trigger());

			this.disposable.push(
				this.trigger.subscribe(this.setTriggerState, this)
			);
		}
	}

	AbstractInput.prototype.setTriggerState = function (nValue)
	{
		switch (Utils.pInt(nValue))
		{
			case Enums.SaveSettingsStep.TrueResult:
				this.classForTrigger('success');
				break;
			case Enums.SaveSettingsStep.FalseResult:
				this.classForTrigger('error');
				break;
			default:
				this.classForTrigger('');
				break;
		}
	};

	_.extend(AbstractInput.prototype, AbstractComponent.prototype);

	AbstractInput.componentExportHelper = AbstractComponent.componentExportHelper;

	module.exports = AbstractInput;

}());
