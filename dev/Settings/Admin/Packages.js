
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Translator = require('Common/Translator'),

		PackageStore = require('Stores/Admin/Package'),
		Remote = require('Remote/Admin/Ajax')
	;

	/**
	 * @constructor
	 */
	function PackagesAdminSettings()
	{
		this.packagesError = ko.observable('');

		this.packages = PackageStore.packages;
		this.packagesReal = PackageStore.packagesReal;
		this.packagesMainUpdatable = PackageStore.packagesMainUpdatable;

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
			return PackageStore.packages.loading() ? 'visible' : 'hidden';
		}, this);
	}

	PackagesAdminSettings.prototype.onShow = function ()
	{
		this.packagesError('');
	};

	PackagesAdminSettings.prototype.onBuild = function ()
	{
		require('App/Admin').reloadPackagesList();
	};

	PackagesAdminSettings.prototype.requestHelper = function (oPackage, bInstall)
	{
		var self = this;
		return function (sResult, oData) {

			if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
			{
				if (oData && oData.ErrorCode)
				{
					self.packagesError(Translator.getNotification(oData.ErrorCode));
				}
				else
				{
					self.packagesError(Translator.getNotification(
						bInstall ? Enums.Notification.CantInstallPackage : Enums.Notification.CantDeletePackage));
				}
			}

			_.each(self.packages(), function (oItem) {
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

	PackagesAdminSettings.prototype.deletePackage = function (oPackage)
	{
		if (oPackage)
		{
			oPackage['loading'](true);
			Remote.packageDelete(this.requestHelper(oPackage, false), oPackage);
		}
	};

	PackagesAdminSettings.prototype.installPackage = function (oPackage)
	{
		if (oPackage)
		{
			oPackage['loading'](true);
			Remote.packageInstall(this.requestHelper(oPackage, true), oPackage);
		}
	};

	module.exports = PackagesAdminSettings;

}());