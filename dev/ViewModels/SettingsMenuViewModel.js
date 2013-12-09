/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {?} oScreen
 * 
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function SettingsMenuViewModel(oScreen)
{
	KnoinAbstractViewModel.call(this, 'Left', 'SettingsMenu');

	this.menu = oScreen.menu;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('SettingsMenuViewModel', SettingsMenuViewModel);

SettingsMenuViewModel.prototype.link = function (sRoute)
{
	return RL.link().settings(sRoute);
};

SettingsMenuViewModel.prototype.backToMailBoxClick = function ()
{
	kn.setHash(RL.link().inbox());
};
