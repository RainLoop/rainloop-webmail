/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminPackages()
{
	var oData = RL.data();
	
	this.packagesError = ko.observable('');
	
	this.packages = oData.packages;
	this.packagesLoading = oData.packagesLoading;
	this.packagesReal = oData.packagesReal;
	this.packagesMainUpdatable = oData.packagesMainUpdatable;

	this.packagesCurrent = this.packages.filter(function (oItem) {
		return oItem && '' !== oItem['installed'] && !oItem['compare'];
	});

	this.packagesAvailableForUpdate = this.packages.filter(function (oItem) {
		return oItem && '' !== oItem['installed'] && !!oItem['compare'];
	});

	this.packagesAvailableForInstallation = this.packages.filter(function (oItem) {
		return oItem && '' === oItem['installed'];
	});
	
	this.visibility = ko.computed(function () {
		return oData.packagesLoading() ? 'visible' : 'hidden';
	}, this);
}

Utils.addSettingsViewModel(AdminPackages, 'AdminSettingsPackages', 'Packages', 'packages');

AdminPackages.prototype.onShow = function ()
{
	this.packagesError('');
};

AdminPackages.prototype.onBuild = function ()
{
	RL.reloadPackagesList();
};

AdminPackages.prototype.requestHelper = function (oPackage, bInstall)
{
	var self = this;
	return function (sResult, oData) {
		
		if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
		{
			if (oData && oData.ErrorCode)
			{
				self.packagesError(Utils.getNotification(oData.ErrorCode));
			}
			else
			{
				self.packagesError(Utils.getNotification(
					bInstall ? Enums.Notification.CantInstallPackage : Enums.Notification.CantDeletePackage));
			}
		}
		
		_.each(RL.data().packages(), function (oItem) {
			if (oItem && oPackage && oItem['loading']() && oPackage['file'] === oItem['file'])
			{
				oPackage['loading'](false);
				oItem['loading'](false);
			}
		});

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result['Reload'])
		{
			window.location.reload();
		}
		else
		{
			RL.reloadPackagesList();
		}
	};
};

AdminPackages.prototype.deletePackage = function (oPackage)
{
	if (oPackage)
	{
		oPackage['loading'](true);
		RL.remote().packageDelete(this.requestHelper(oPackage, false), oPackage);
	}
};

AdminPackages.prototype.installPackage = function (oPackage)
{
	if (oPackage)
	{
		oPackage['loading'](true);
		RL.remote().packageInstall(this.requestHelper(oPackage, true), oPackage);
	}
};
