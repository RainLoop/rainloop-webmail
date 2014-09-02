
(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		Globals = require('Globals'),

		AbstractSettingsScreen = require('Screen:AbstractSettings')
	;

	/**
	 * @constructor
	 * @extends AbstractSettingsScreen
	 */
	function SettingsScreen()
	{
		AbstractSettingsScreen.call(this, [
			require('View:RainLoop:SettingsSystemDropDown'),
			require('View:RainLoop:SettingsMenu'),
			require('View:RainLoop:SettingsPane')
		]);

		Utils.initOnStartOrLangChange(function () {
			this.sSettingsTitle = Utils.i18n('TITLES/SETTINGS');
		}, this, function () {
			this.setSettingsTitle();
		});
	}

	_.extend(SettingsScreen.prototype, AbstractSettingsScreen.prototype);

	SettingsScreen.prototype.onShow = function ()
	{
		this.setSettingsTitle();
		Globals.keyScope(Enums.KeyState.Settings);
	};

	SettingsScreen.prototype.setSettingsTitle = function ()
	{
		require('App:RainLoop').setTitle(this.sSettingsTitle);
	};

	module.exports = SettingsScreen;

}(module, require));