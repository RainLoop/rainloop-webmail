
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
	function TextAreaComponent(oParams) {

		AbstractInput.call(this, oParams);

		this.rows = oParams.rows || 5;
		this.spellcheck = Utils.isUnd(oParams.spellcheck) ? false : !!oParams.spellcheck;
	};

	_.extend(TextAreaComponent.prototype, AbstractInput.prototype);

	module.exports = AbstractInput.componentExportHelper(
		TextAreaComponent, 'TextAreaComponent');

}());
