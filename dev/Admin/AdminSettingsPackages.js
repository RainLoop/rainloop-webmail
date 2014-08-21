/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		ko = require('../External/ko.js'),

		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),

		Data = require('../Storages/AdminDataStorage.js'),
		Remote = require('../Storages/AdminAjaxRemoteStorage.js')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsPackages()
	{
		this.packagesError = ko.observable('');

		this.packages = Data.packages;
		this.packagesLoading = Data.packagesLoading;
		this.packagesReal = Data.packagesReal;
		this.packagesMainUpdatable = Data.packagesMainUpdatable;

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
			return Data.packagesLoading() ? 'visible' : 'hidden';
		}, this);
	}

	kn.addSettingsViewModel(AdminSettingsPackages, 'AdminSettingsPackages', 'Packages', 'packages');

	AdminSettingsPackages.prototype.onShow = function ()
	{
		this.packagesError('');
	};

	AdminSettingsPackages.prototype.onBuild = function ()
	{
		RL.reloadPackagesList();
	};

	AdminSettingsPackages.prototype.requestHelper = function (oPackage, bInstall)
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

			_.each(Data.packages(), function (oItem) {
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

	AdminSettingsPackages.prototype.deletePackage = function (oPackage)
	{
		if (oPackage)
		{
			oPackage['loading'](true);
			Remote.packageDelete(this.requestHelper(oPackage, false), oPackage);
		}
	};

	AdminSettingsPackages.prototype.installPackage = function (oPackage)
	{
		if (oPackage)
		{
			oPackage['loading'](true);
			Remote.packageInstall(this.requestHelper(oPackage, true), oPackage);
		}
	};

	module.exports = AdminSettingsPackages;

}(module));