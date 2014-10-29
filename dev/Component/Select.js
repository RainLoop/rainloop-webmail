
(function () {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Common/Utils'),

		AbstractInput = require('Component/AbstractInput')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstractInput
	 */
	function SelectComponent(oParams) {

		AbstractInput.call(this, oParams);

		this.options = oParams.options || '';

		this.optionsText = oParams.optionsText || null;
		this.optionsValue = oParams.optionsValue || null;

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
	};

	_.extend(SelectComponent.prototype, AbstractInput.prototype);

	module.exports = AbstractInput.componentExportHelper(
		SelectComponent, 'SelectComponent');

}());
