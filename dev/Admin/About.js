/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminAbout()
{
	var oData = RL.data();

	this.version = ko.observable(RL.settingsGet('Version'));
	this.access = ko.observable(!!RL.settingsGet('CoreAccess'));
	this.errorDesc = ko.observable('');

	this.coreReal = oData.coreReal;
	this.coreUpdatable = oData.coreUpdatable;
	this.coreAccess = oData.coreAccess;
	this.coreChecking = oData.coreChecking;
	this.coreUpdating = oData.coreUpdating;
	this.coreRemoteVersion = oData.coreRemoteVersion;
	this.coreRemoteRelease = oData.coreRemoteRelease;
	this.coreVersionCompare = oData.coreVersionCompare;

	this.statusType = ko.computed(function () {

		var
			sType = '',
			iVersionCompare = this.coreVersionCompare(),
			bChecking = this.coreChecking(),
			bUpdating = this.coreUpdating(),
			bReal = this.coreReal()
		;

		if (bChecking)
		{
			sType = 'checking';
		}
		else if (bUpdating)
		{
			sType = 'updating';
		}
		else if (bReal && 0 === iVersionCompare)
		{
			sType = 'up-to-date';
		}
		else if (bReal && -1 === iVersionCompare)
		{
			sType = 'available';
		}
		else if (!bReal)
		{
			sType = 'error';
			this.errorDesc('Cannot access the repository at the moment.');
		}

		return sType;

	}, this);
}

Utils.addSettingsViewModel(AdminAbout, 'AdminSettingsAbout', 'About', 'about');

AdminAbout.prototype.onBuild = function ()
{
	if (this.access())
	{
		RL.reloadCoreData();
	}
};

AdminAbout.prototype.updateCoreData = function ()
{
	if (!this.coreUpdating())
	{
		RL.updateCoreData();
	}
};
