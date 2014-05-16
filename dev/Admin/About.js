/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminAbout()
{
	this.version = ko.observable(RL.settingsGet('Version'));
}

Utils.addSettingsViewModel(AdminAbout, 'AdminSettingsAbout', 'About', 'about');

//AdminAbout.prototype.onBuild = function ()
//{
//
//};
