
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		AbstractComponent = require('Component/Abstract')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstractComponent
	 */
	function AbstracCheckbox(oParams)
	{
		AbstractComponent.call(this);

		this.value = oParams.value;
		if (Utils.isUnd(this.value) || !this.value.subscribe)
		{
			this.value = ko.observable(Utils.isUnd(this.value) ? false : !!this.value);
		}

		this.enable = oParams.enable;
		if (Utils.isUnd(this.enable) || !this.enable.subscribe)
		{
			this.enable = ko.observable(Utils.isUnd(this.enable) ? true : !!this.enable);
		}

		this.disable = oParams.disable;
		if (Utils.isUnd(this.disable) || !this.disable.subscribe)
		{
			this.disable = ko.observable(Utils.isUnd(this.disable) ? false : !!this.disable);
		}

		this.label = oParams.label || '';
		this.inline = Utils.isUnd(oParams.inline) ? false : oParams.inline;

		this.readOnly = Utils.isUnd(oParams.readOnly) ? false : !!oParams.readOnly;
		this.inverted = Utils.isUnd(oParams.inverted) ? false : !!oParams.inverted;

		this.labeled = !Utils.isUnd(oParams.label);
		this.labelAnimated = !!oParams.labelAnimated;
	}

	_.extend(AbstracCheckbox.prototype, AbstractComponent.prototype);

	AbstracCheckbox.prototype.click = function()
	{
		if (!this.readOnly && this.enable() && !this.disable())
		{
			this.value(!this.value());
		}
	};

	AbstracCheckbox.componentExportHelper = AbstractComponent.componentExportHelper;

	module.exports = AbstracCheckbox;

}());
