/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),
		AbstractSettings = require('../AbstractSettings.js'),
		SettingsSystemDropDownViewModel = require('../ViewModels/SettingsSystemDropDownViewModel.js'),
		SettingsMenuViewModel = require('../ViewModels/SettingsMenuViewModel.js'),
		SettingsPaneViewModel = require('../ViewModels/SettingsPaneViewModel.js')
	;

	/**
	 * @constructor
	 * @extends AbstractSettings
	 */
	function SettingsScreen()
	{
		AbstractSettings.call(this, [
			SettingsSystemDropDownViewModel,
			SettingsMenuViewModel,
			SettingsPaneViewModel
		]);

		Utils.initOnStartOrLangChange(function () {
			this.sSettingsTitle = Utils.i18n('TITLES/SETTINGS');
		}, this, function () {
			RL.setTitle(this.sSettingsTitle); // TODO cjs
		});
	}

	_.extend(SettingsScreen.prototype, AbstractSettings.prototype);

	SettingsScreen.prototype.onShow = function ()
	{
		RL.setTitle(this.sSettingsTitle); // TODO cjs
		RL.data().keyScope(Enums.KeyState.Settings); // TODO cjs
	};

	module.exports = SettingsScreen;

}(module));