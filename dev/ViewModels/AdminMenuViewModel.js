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

	this.menu = oScreen.menu;
}

Utils.extendAsViewModel('AdminMenuViewModel', AdminMenuViewModel);

AdminMenuViewModel.prototype.link = function (sRoute)
{
	return '#/' + sRoute;
};
