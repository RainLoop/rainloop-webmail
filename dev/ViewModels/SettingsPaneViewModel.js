/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function SettingsPaneViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'SettingsPane');
}

Utils.extendAsViewModel('SettingsPaneViewModel', SettingsPaneViewModel);

SettingsPaneViewModel.prototype.onShow = function ()
{
	RL.data().message(null);
};

SettingsPaneViewModel.prototype.backToMailBoxClick = function ()
{
	kn.setHash(RL.link().inbox());
};
