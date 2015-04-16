
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
	function ClassicCheckboxComponent(oParams)
	{
		AbstracCheckbox.call(this, oParams);
	}

	_.extend(ClassicCheckboxComponent.prototype, AbstracCheckbox.prototype);

	module.exports = AbstracCheckbox.componentExportHelper(
		ClassicCheckboxComponent, 'CheckboxClassicComponent');

}());
