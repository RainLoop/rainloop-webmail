/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		key = require('key'),

		Enums = require('Enums'),
		LinkBuilder = require('LinkBuilder'),

		Data = require('../Storages/WebMailDataStorage.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
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

}(module, require));