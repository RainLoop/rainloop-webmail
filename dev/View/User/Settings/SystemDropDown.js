
(function () {

	'use strict';

	var
		_ = require('_'),

		kn = require('Knoin/Knoin'),
		AbstractSystemDropDownUserView = require('View/User/AbstractSystemDropDown')
	;

	/**
	 * @constructor
	 * @extends AbstractSystemDropDownUserView
	 */
	function SystemDropDownSettingsUserView()
	{
		AbstractSystemDropDownUserView.call(this);
		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/Settings/SystemDropDown', 'View/App/Settings/SystemDropDown', 'SettingsSystemDropDownViewModel'], SystemDropDownSettingsUserView);
	_.extend(SystemDropDownSettingsUserView.prototype, AbstractSystemDropDownUserView.prototype);

	module.exports = SystemDropDownSettingsUserView;

}());
