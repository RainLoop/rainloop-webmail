
(function () {

	'use strict';

	var
		_ = require('_'),
		key = require('key'),

		Enums = require('Common/Enums'),
		LinkBuilder = require('Common/LinkBuilder'),

		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
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

	kn.extendAsViewModel(['View:RainLoop:SettingsPane', 'SettingsPaneViewModel'], SettingsPaneViewModel);
	_.extend(SettingsPaneViewModel.prototype, KnoinAbstractViewModel.prototype);

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

}());