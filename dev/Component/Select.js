
(function () {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		AbstractInput = require('Component/AbstractInput')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstractInput
	 */
	function SelectComponent(oParams)
	{
		AbstractInput.call(this, oParams);

		this.options = oParams.options || '';

		this.optionsText = oParams.optionsText || null;
		this.optionsValue = oParams.optionsValue || null;
		this.optionsCaption = oParams.optionsCaption || null;

		if (this.optionsCaption)
		{
			this.optionsCaption = Translator.i18n(this.optionsCaption);
		}

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
	}

	_.extend(SelectComponent.prototype, AbstractInput.prototype);

	module.exports = AbstractInput.componentExportHelper(
		SelectComponent, 'SelectComponent');

}());
