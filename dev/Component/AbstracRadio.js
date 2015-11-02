
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
	function AbstracRadio(oParams)
	{
		AbstractComponent.call(this);

		this.values = ko.observableArray([]);

		this.value = oParams.value;
		if (Utils.isUnd(this.value) || !this.value.subscribe)
		{
			this.value = ko.observable('');
		}

		this.inline = Utils.isUnd(oParams.inline) ? false : oParams.inline;
		this.readOnly = Utils.isUnd(oParams.readOnly) ? false : !!oParams.readOnly;

		if (oParams.values)
		{
			var aValues = _.map(oParams.values, function (sLabel, sValue) {
				return {
					'label': sLabel,
					'value': sValue
				};
			});

			this.values(aValues);
		}

		this.click = _.bind(this.click, this);
	}

	AbstracRadio.prototype.click = function(oValue) {
		if (!this.readOnly && oValue)
		{
			this.value(oValue.value);
		}
	};

	_.extend(AbstracRadio.prototype, AbstractComponent.prototype);

	AbstracRadio.componentExportHelper = AbstractComponent.componentExportHelper;

	module.exports = AbstracRadio;

}());
