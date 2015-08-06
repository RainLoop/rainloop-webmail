
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),
		progressJs = require('progressJs'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Translator = require('Common/Translator'),

		Settings = require('Storage/Settings'),
		AppStore = require('Stores/Admin/App'),
		DomainStore = require('Stores/Admin/Domain'),
		PluginStore = require('Stores/Admin/Plugin'),
		LicenseStore = require('Stores/Admin/License'),
		PackageStore = require('Stores/Admin/Package'),
		CoreStore = require('Stores/Admin/Core'),
		Remote = require('Remote/Admin/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractApp = require('App/Abstract')
	;

	/**
	 * @constructor
	 * @extends AbstractApp
	 */
	function AdminApp()
	{
		AbstractApp.call(this, Remote);
	}

	_.extend(AdminApp.prototype, AbstractApp.prototype);

	AdminApp.prototype.remote = function ()
	{
		return Remote;
	};

	AdminApp.prototype.reloadDomainList = function ()
	{
		DomainStore.domains.loading(true);

		Remote.domainList(function (sResult, oData) {
			DomainStore.domains.loading(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var aList = _.map(oData.Result, function (bEnabled, sName) {
					return {
						'name': sName,
						'disabled': ko.observable(!bEnabled),
						'deleteAccess': ko.observable(false)
					};
				}, this);

				DomainStore.domains(aList);
			}
		});
	};

	AdminApp.prototype.reloadPluginList = function ()
	{
		PluginStore.plugins.loading(true);

		Remote.pluginList(function (sResult, oData) {

			PluginStore.plugins.loading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var aList = _.map(oData.Result, function (oItem) {
					return {
						'name': oItem['Name'],
						'disabled': ko.observable(!oItem['Enabled']),
						'configured': ko.observable(!!oItem['Configured'])
					};
				}, this);

				PluginStore.plugins(aList);
			}
		});
	};

	AdminApp.prototype.reloadPackagesList = function ()
	{
		PackageStore.packages.loading(true);
		PackageStore.packagesReal(true);

		Remote.packagesList(function (sResult, oData) {

			PackageStore.packages.loading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				PackageStore.packagesReal(!!oData.Result.Real);
				PackageStore.packagesMainUpdatable(!!oData.Result.MainUpdatable);

				var
					aList = [],
					aLoading = {}
				;

				_.each(PackageStore.packages(), function (oItem) {
					if (oItem && oItem['loading']())
					{
						aLoading[oItem['file']] = oItem;
					}
				});

				if (Utils.isArray(oData.Result.List))
				{
					aList = _.compact(_.map(oData.Result.List, function (oItem) {
						if (oItem)
						{
							oItem['loading'] = ko.observable(!Utils.isUnd(aLoading[oItem['file']]));
							return 'core' === oItem['type'] && !oItem['canBeInstalled'] ? null : oItem;
						}
						return null;
					}));
				}

				PackageStore.packages(aList);
			}
			else
			{
				PackageStore.packagesReal(false);
			}
		});
	};

	AdminApp.prototype.updateCoreData = function ()
	{
		CoreStore.coreUpdating(true);
		Remote.updateCoreData(function (sResult, oData) {

			CoreStore.coreUpdating(false);
			CoreStore.coreVersion('');
			CoreStore.coreRemoteVersion('');
			CoreStore.coreRemoteRelease('');
			CoreStore.coreVersionCompare(-2);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				CoreStore.coreReal(true);
				window.location.reload();
			}
			else
			{
				CoreStore.coreReal(false);
			}
		});

	};

	AdminApp.prototype.reloadCoreData = function ()
	{
		CoreStore.coreChecking(true);
		CoreStore.coreReal(true);

		Remote.coreData(function (sResult, oData) {

			CoreStore.coreChecking(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				CoreStore.coreReal(!!oData.Result.Real);
				CoreStore.coreChannel(oData.Result.Channel || 'stable');
				CoreStore.coreType(oData.Result.Type || 'stable');
				CoreStore.coreUpdatable(!!oData.Result.Updatable);
				CoreStore.coreAccess(!!oData.Result.Access);
				CoreStore.coreWarning(!!oData.Result.Warning);
				CoreStore.coreVersion(oData.Result.Version || '');
				CoreStore.coreRemoteVersion(oData.Result.RemoteVersion || '');
				CoreStore.coreRemoteRelease(oData.Result.RemoteRelease || '');
				CoreStore.coreVersionCompare(Utils.pInt(oData.Result.VersionCompare));
			}
			else
			{
				CoreStore.coreReal(false);
				CoreStore.coreChannel('stable');
				CoreStore.coreType('stable');
				CoreStore.coreWarning(false);
				CoreStore.coreVersion('');
				CoreStore.coreRemoteVersion('');
				CoreStore.coreRemoteRelease('');
				CoreStore.coreVersionCompare(-2);
			}
		});
	};

	/**
	 *
	 * @param {boolean=} bForce = false
	 */
	AdminApp.prototype.reloadLicensing = function (bForce)
	{
		bForce = Utils.isUnd(bForce) ? false : !!bForce;

		LicenseStore.licensingProcess(true);
		LicenseStore.licenseError('');

		Remote.licensing(function (sResult, oData) {

			LicenseStore.licensingProcess(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result && Utils.isNormal(oData.Result['Expired']))
			{
				LicenseStore.licenseValid(true);
				LicenseStore.licenseExpired(Utils.pInt(oData.Result['Expired']));
				LicenseStore.licenseError('');

				LicenseStore.licensing(true);

				AppStore.prem(true);
			}
			else
			{
				if (oData && oData.ErrorCode && -1 < Utils.inArray(Utils.pInt(oData.ErrorCode), [
					Enums.Notification.LicensingServerIsUnavailable,
					Enums.Notification.LicensingExpired
				]))
				{
					LicenseStore.licenseError(Translator.getNotification(Utils.pInt(oData.ErrorCode)));
					LicenseStore.licensing(true);
				}
				else
				{
					if (Enums.StorageResultType.Abort === sResult)
					{
						LicenseStore.licenseError(Translator.getNotification(Enums.Notification.LicensingServerIsUnavailable));
						LicenseStore.licensing(true);
					}
					else
					{
						LicenseStore.licensing(false);
					}
				}
			}
		}, bForce);
	};

	AdminApp.prototype.bootstart = function ()
	{
		AbstractApp.prototype.bootstart.call(this);

		require('Stores/Admin/App').populate();
		require('Stores/Admin/Capa').populate();

		kn.hideLoading();

		if (!Settings.settingsGet('AllowAdminPanel'))
		{
			kn.routeOff();
			kn.setHash(Links.root(), true);
			kn.routeOff();

			_.defer(function () {
				window.location.href = '/';
			});
		}
		else
		{
			if (!!Settings.settingsGet('Auth'))
			{
				kn.startScreens([
					require('Screen/Admin/Settings')
				]);
			}
			else
			{
				kn.startScreens([
					require('Screen/Admin/Login')
				]);
			}
		}

		if (progressJs)
		{
			progressJs().end();
		}
	};

	module.exports = new AdminApp();

}());