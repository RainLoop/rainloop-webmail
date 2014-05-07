/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {?} oScreen
 *
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function AdminMenuViewModel(oScreen)
{
	KnoinAbstractViewModel.call(this, 'Left', 'AdminMenu');

	this.leftPanelDisabled = RL.data().leftPanelDisabled;

	this.menu = oScreen.menu;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('AdminMenuViewModel', AdminMenuViewModel);

AdminMenuViewModel.prototype.link = function (sRoute)
{
	return '#/' + sRoute;
};
