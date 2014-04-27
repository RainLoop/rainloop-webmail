/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function AdminPaneViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'AdminPane');

	this.adminDomain = ko.observable(RL.settingsGet('AdminDomain'));
	this.version = ko.observable(RL.settingsGet('Version'));

	this.adminManLoadingVisibility = RL.data().adminManLoadingVisibility;
	this.leftPanelDisabled = RL.data().leftPanelDisabled;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('AdminPaneViewModel', AdminPaneViewModel);

AdminPaneViewModel.prototype.logoutClick = function ()
{
	RL.remote().adminLogout(function () {
		RL.loginAndLogoutReload();
	});
};