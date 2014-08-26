/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		Globals = require('Globals'),

		AbstractSettings = require('./AbstractSettings.js')
	;

	/**
	 * @constructor
	 * @extends AbstractSettings
	 */
	function SettingsScreen()
	{
		var
			App = require('../Apps/RainLoopApp.js'),

			SettingsSystemDropDownViewModel = require('../ViewModels/SettingsSystemDropDownViewModel.js'),
			SettingsMenuViewModel = require('../ViewModels/SettingsMenuViewModel.js'),
			SettingsPaneViewModel = require('../ViewModels/SettingsPaneViewModel.js')
		;

		AbstractSettings.call(this, [
			SettingsSystemDropDownViewModel,
			SettingsMenuViewModel,
			SettingsPaneViewModel
		]);

		Utils.initOnStartOrLangChange(function () {
			this.sSettingsTitle = Utils.i18n('TITLES/SETTINGS');
		}, this, function () {
			App.setTitle(this.sSettingsTitle);
		});
	}

	_.extend(SettingsScreen.prototype, AbstractSettings.prototype);

	SettingsScreen.prototype.onShow = function ()
	{
		var App = require('../Apps/RainLoopApp.js');

		App.setTitle(this.sSettingsTitle);
		Globals.keyScope(Enums.KeyState.Settings);
	};

	module.exports = SettingsScreen;

}(module, require));