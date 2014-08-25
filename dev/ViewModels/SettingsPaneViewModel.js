/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		key = require('../External/key.js'),

		Enums = require('../Common/Enums.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		Data = require('../Storages/WebMailDataStorage.js'),

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

	kn.extendAsViewModel('SettingsPaneViewModel', SettingsPaneViewModel);

	SettingsPaneViewModel.prototype.onBuild = function ()
	{
		var self = this;
		key('esc', Enums.KeyState.Settings, function () {
			self.backToMailBoxClick();
		});
	};

	SettingsPaneViewModel.prototype.onShow = function ()
	{
		Data.message(null);
	};

	SettingsPaneViewModel.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(LinkBuilder.inbox());
	};

	module.exports = SettingsPaneViewModel;

}(module));