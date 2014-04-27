/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function SettingsPaneViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'SettingsPane');

	this.leftPanelDisabled = RL.data().leftPanelDisabled;

	Knoin.constructorEnd(this);
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
	RL.data().message(null);
};

SettingsPaneViewModel.prototype.backToMailBoxClick = function ()
{
	kn.setHash(RL.link().inbox());
};
