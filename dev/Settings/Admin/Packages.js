
(function () {

	'use strict';

	var
		window = require('window'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Data = require('Storage/Admin/Data'),
		Remote = require('Storage/Admin/Remote')
	;

	/**
	 * @constructor
	 */
	function PackagesAdminSetting()
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

	PackagesAdminSetting.prototype.onShow = function ()
	{
		this.packagesError('');
	};

	PackagesAdminSetting.prototype.onBuild = function ()
	{
		require('App/Admin').reloadPackagesList();
	};

	PackagesAdminSetting.prototype.requestHelper = function (oPackage, bInstall)
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
				require('App/Admin').reloadPackagesList();
			}
		};
	};

	PackagesAdminSetting.prototype.deletePackage = function (oPackage)
	{
		if (oPackage)
		{
			oPackage['loading'](true);
			Remote.packageDelete(this.requestHelper(oPackage, false), oPackage);
		}
	};

	PackagesAdminSetting.prototype.installPackage = function (oPackage)
	{
		if (oPackage)
		{
			oPackage['loading'](true);
			Remote.packageInstall(this.requestHelper(oPackage, true), oPackage);
		}
	};

	module.exports = PackagesAdminSetting;

}());