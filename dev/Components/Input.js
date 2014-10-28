
(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		AbstractInput = require('Components/AbstractInput')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstractInput
	 */
	function InputComponent(oParams) {

		AbstractInput.call(this, oParams);

		this.placeholder = oParams.placeholder || ''
	};

	InputComponent.prototype.setTriggerState = function (nValue)
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

	_.extend(InputComponent.prototype, AbstractInput.prototype);

	module.exports = AbstractInput.componentExportHelper(
		InputComponent, 'InputComponent');

}());
