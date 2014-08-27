/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		ko = require('ko'),
		
		kn = require('App:Knoin'),
		Settings = require('Storage:Settings'),

		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AboutViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Center', 'About');

		this.version = ko.observable(Settings.settingsGet('Version'));

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AboutViewModel', AboutViewModel);

	module.exports = AboutViewModel;

}(module, require));