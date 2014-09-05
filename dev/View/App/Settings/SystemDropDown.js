
(function () {

	'use strict';

	var
		_ = require('_'),

		kn = require('Knoin/Knoin'),
		AbstractSystemDropDownAppView = require('View/App/AbstractSystemDropDown')
	;

	/**
	 * @constructor
	 * @extends AbstractSystemDropDownAppView
	 */
	function SystemDropDownSettingsAppView()
	{
		AbstractSystemDropDownAppView.call(this);
		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/App/Settings/SystemDropDown', 'SettingsSystemDropDownViewModel'], SystemDropDownSettingsAppView);
	_.extend(SystemDropDownSettingsAppView.prototype, AbstractSystemDropDownAppView.prototype);

	module.exports = SystemDropDownSettingsAppView;

}());