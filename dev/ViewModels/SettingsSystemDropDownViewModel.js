
(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		
		kn = require('App:Knoin'),
		AbstractSystemDropDownViewModel = require('View:RainLoop:AbstractSystemDropDown')
	;

	/**
	 * @constructor
	 * @extends AbstractSystemDropDownViewModel
	 */
	function SettingsSystemDropDownViewModel()
	{
		AbstractSystemDropDownViewModel.call(this);
		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:SettingsSystemDropDown', 'SettingsSystemDropDownViewModel'], SettingsSystemDropDownViewModel);
	_.extend(SettingsSystemDropDownViewModel.prototype, AbstractSystemDropDownViewModel.prototype);

	module.exports = SettingsSystemDropDownViewModel;

}(module, require));