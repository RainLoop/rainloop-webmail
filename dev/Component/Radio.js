
(function () {

	'use strict';

	var
		_ = require('_'),

		AbstracRadio = require('Component/AbstracRadio')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstracRadio
	 */
	function RadioComponent(oParams) {

		AbstracRadio.call(this, oParams);
	};

	_.extend(RadioComponent.prototype, AbstracRadio.prototype);

	module.exports = AbstracRadio.componentExportHelper(
		RadioComponent, 'RadioComponent');

}());
