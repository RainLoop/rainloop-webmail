
(function () {

	'use strict';

	var
		_ = require('_'),
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

	kn.extendAsViewModel(['View:RainLoop:About', 'AboutViewModel'], AboutViewModel);
	_.extend(AboutViewModel.prototype, KnoinAbstractViewModel.prototype);

	module.exports = AboutViewModel;

}());