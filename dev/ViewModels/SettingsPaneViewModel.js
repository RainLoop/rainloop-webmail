/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		key = require('../External/key.js'),
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),
		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function SettingsPaneViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'SettingsPane');

		kn.constructorEnd(this);
	}

	Utils.extendAsViewModel('SettingsPaneViewModel', SettingsPaneViewModel);

	SettingsPaneViewModel.prototype.onBuild = function ()
	{
		var self = this;
		key('esc', Enums.KeyState.Settings, function () {
			self.backToMailBoxClick();
		});
	};

	SettingsPaneViewModel.prototype.onShow = function ()
	{
		RL.data().message(null); // TODO cjs
	};

	SettingsPaneViewModel.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(RL.link().inbox()); // TODO cjs
	};

	module.exports = SettingsPaneViewModel;

}(module));