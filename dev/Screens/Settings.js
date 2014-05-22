/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
		RL.setTitle(this.sSettingsTitle);
	});
}

_.extend(SettingsScreen.prototype, AbstractSettings.prototype);

SettingsScreen.prototype.onShow = function ()
{
	RL.setTitle(this.sSettingsTitle);
	RL.data().keyScope(Enums.KeyState.Settings);
};
