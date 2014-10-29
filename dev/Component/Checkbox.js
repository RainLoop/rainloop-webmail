
(function () {

	'use strict';

	var
		_ = require('_'),

		AbstracCheckbox = require('Component/AbstracCheckbox')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstracCheckbox
	 */
	function CheckboxComponent(oParams) {

		AbstracCheckbox.call(this, oParams);
	};

	_.extend(CheckboxComponent.prototype, AbstracCheckbox.prototype);

	module.exports = AbstracCheckbox.componentExportHelper(
		CheckboxComponent, 'CheckboxComponent');

}());
