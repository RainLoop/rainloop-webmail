
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		AbstractComponent = require('Components/Abstract')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstractComponent
	 */
	function CheckboxComponent(oParams) {

		AbstractComponent.call(this);

		this.value = oParams.value || ko.observable(false);
		this.label = oParams.label || '';
		this.inline = oParams.inline;
	};

	_.extend(CheckboxComponent.prototype, AbstractComponent.prototype);

	CheckboxComponent.prototype.toggle = function() {
		this.value(!this.value());
	};

	module.exports = AbstractComponent.componentExportHelper(
		CheckboxComponent, 'CheckboxComponent');

}());
