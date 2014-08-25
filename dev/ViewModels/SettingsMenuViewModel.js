/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		LinkBuilder = require('LinkBuilder'),
		Globals = require('Globals'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
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

	kn.extendAsViewModel('SettingsMenuViewModel', SettingsMenuViewModel);

	SettingsMenuViewModel.prototype.link = function (sRoute)
	{
		return LinkBuilder.settings(sRoute);
	};

	SettingsMenuViewModel.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(LinkBuilder.inbox());
	};

	module.exports = SettingsMenuViewModel;

}(module, require));