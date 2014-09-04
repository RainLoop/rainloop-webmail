
(function () {

	'use strict';

	var
		_ = require('_'),
		
		Globals = require('Common/Globals'),
		LinkBuilder = require('Common/LinkBuilder'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function SettingsMenuViewModel(oScreen)
	{
		KnoinAbstractViewModel.call(this, 'Left', 'SettingsMenu');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:SettingsMenu', 'SettingsMenuViewModel'], SettingsMenuViewModel);
	_.extend(SettingsMenuViewModel.prototype, KnoinAbstractViewModel.prototype);

	SettingsMenuViewModel.prototype.link = function (sRoute)
	{
		return LinkBuilder.settings(sRoute);
	};

	SettingsMenuViewModel.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(LinkBuilder.inbox());
	};

	module.exports = SettingsMenuViewModel;

}());