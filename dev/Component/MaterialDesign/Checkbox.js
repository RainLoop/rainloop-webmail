
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		AbstracCheckbox = require('Component/AbstracCheckbox')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstracCheckbox
	 */
	function CheckboxMaterialDesignComponent(oParams)
	{
		AbstracCheckbox.call(this, oParams);

		this.animationBox = ko.observable(false).extend({'falseTimeout': 200});
		this.animationCheckmark = ko.observable(false).extend({'falseTimeout': 200});

		this.animationBoxSetTrue = _.bind(this.animationBoxSetTrue, this);
		this.animationCheckmarkSetTrue = _.bind(this.animationCheckmarkSetTrue, this);

		this.disposable.push(
			this.value.subscribe(function (bValue) {
				this.triggerAnimation(bValue);
			}, this)
		);
	}

	_.extend(CheckboxMaterialDesignComponent.prototype, AbstracCheckbox.prototype);

	CheckboxMaterialDesignComponent.prototype.animationBoxSetTrue = function()
	{
		this.animationBox(true);
	};

	CheckboxMaterialDesignComponent.prototype.animationCheckmarkSetTrue = function()
	{
		this.animationCheckmark(true);
	};

	CheckboxMaterialDesignComponent.prototype.triggerAnimation = function(bBox)
	{
		if (bBox)
		{
			this.animationBoxSetTrue();
			_.delay(this.animationCheckmarkSetTrue, 200);
		}
		else
		{
			this.animationCheckmarkSetTrue();
			_.delay(this.animationBoxSetTrue, 200);
		}
	};

	module.exports = AbstracCheckbox.componentExportHelper(
		CheckboxMaterialDesignComponent, 'CheckboxMaterialDesignComponent');

}());
