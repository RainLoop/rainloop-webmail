
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Settings = require('Storage/Settings'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function AboutAppView()
	{
		AbstractView.call(this, 'Center', 'About');

		this.version = ko.observable(Settings.settingsGet('Version'));

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/App/About', 'AboutViewModel'], AboutAppView);
	_.extend(AboutAppView.prototype, AbstractView.prototype);

	module.exports = AboutAppView;

}());