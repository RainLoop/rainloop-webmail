
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
	function TextAreaComponent(oParams) {

		AbstractInput.call(this, oParams);

		this.rows = oParams.rows || 5;
	};

	_.extend(TextAreaComponent.prototype, AbstractInput.prototype);

	module.exports = AbstractInput.componentExportHelper(
		TextAreaComponent, 'TextAreaComponent');

}());
