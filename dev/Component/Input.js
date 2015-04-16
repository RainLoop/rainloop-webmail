
(function () {

	'use strict';

	var
		_ = require('_'),

		AbstractInput = require('Component/AbstractInput')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstractInput
	 */
	function InputComponent(oParams)
	{
		AbstractInput.call(this, oParams);
	}

	_.extend(InputComponent.prototype, AbstractInput.prototype);

	module.exports = AbstractInput.componentExportHelper(
		InputComponent, 'InputComponent');

}());
