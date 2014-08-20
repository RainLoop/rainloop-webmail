/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		Utils = require('../Common/Utils.js'),
		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
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

		this.leftPanelDisabled = RL.data().leftPanelDisabled; // TODO cjs

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	Utils.extendAsViewModel('SettingsMenuViewModel', SettingsMenuViewModel);

	SettingsMenuViewModel.prototype.link = function (sRoute)
	{
		return RL.link().settings(sRoute);// TODO cjs
	};

	SettingsMenuViewModel.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(RL.link().inbox()); // TODO cjs
	};

	module.exports = SettingsMenuViewModel;

}(module));