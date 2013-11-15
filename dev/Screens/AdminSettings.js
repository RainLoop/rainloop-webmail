/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends AbstractSettings
 */
function AdminSettingsScreen()
{
	AbstractSettings.call(this, [
		AdminMenuViewModel,
		AdminPaneViewModel
	]);
}

_.extend(AdminSettingsScreen.prototype, AbstractSettings.prototype);

AdminSettingsScreen.prototype.onShow = function ()
{
//	AbstractSettings.prototype.onShow.call(this);
	
	RL.setTitle('');
};