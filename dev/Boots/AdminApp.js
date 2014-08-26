/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),
		_ = require('_'),
		window = require('window'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		kn = require('kn'),

		AppSettings = require('../Storages/AppSettings.js'),
		Data = require('../Storages/AdminDataStorage.js'),
		Remote = require('../Storages/AdminAjaxRemoteStorage.js'),

		AdminSettingsScreen = require('../Screens/AdminSettingsScreen.js'),
		AdminLoginScreen = require('../Screens/AdminLoginScreen.js'),

		AbstractApp = require('./AbstractApp.js')
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

	AdminApp.prototype.data = function ()
	{
		return Data;
	};

	AdminApp.prototype.setupSettings = function ()
	{
		kn.addSettingsViewModel(require('../Admin/AdminSettingsGeneral.js'),
			'AdminSettingsGeneral', 'General', 'general', true);

		kn.addSettingsViewModel(require('../Admin/AdminSettingsLogin.js'),
			'AdminSettingsLogin', 'Login', 'login');

		if (AppSettings.capa(Enums.Capa.Prem))
		{
			kn.addSettingsViewModel(require('../Admin/AdminSettingsBranding.js'),
				'AdminSettingsBranding', 'Branding', 'branding');
		}

		kn.addSettingsViewModel(require('../Admin/AdminSettingsContacts.js'),
			'AdminSettingsContacts', 'Contacts', 'contacts');

		kn.addSettingsViewModel(require('../Admin/AdminSettingsDomains.js'),
			'AdminSettingsDomains', 'Domains', 'domains');

		kn.addSettingsViewModel(require('../Admin/AdminSettingsSecurity.js'),
			'AdminSettingsSecurity', 'Security', 'security');

		kn.addSettingsViewModel(require('../Admin/AdminSettingsSocial.js'),
			'AdminSettingsSocial', 'Social', 'social');

		kn.addSettingsViewModel(require('../Admin/AdminSettingsPlugins.js'),
			'AdminSettingsPlugins', 'Plugins', 'plugins');

		kn.addSettingsViewModel(require('../Admin/AdminSettingsPackages.js'),
			'AdminSettingsPackages', 'Packages', 'packages');

		kn.addSettingsViewModel(require('../Admin/AdminSettingsLicensing.js'),
			'AdminSettingsLicensing', 'Licensing', 'licensing');

		kn.addSettingsViewModel(require('../Admin/AdminSettingsAbout.js'),
			'AdminSettingsAbout', 'About', 'about');

		return true;
	};

	AdminApp.prototype.reloadDomainList = function ()
	{
		Data.domainsLoading(true);

		Remote.domainList(function (sResult, oData) {
			Data.domainsLoading(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var aList = _.map(oData.Result, function (bEnabled, sName) {
					return {
						'name': sName,
						'disabled': ko.observable(!bEnabled),
						'deleteAccess': ko.observable(false)
					};
				}, this);

				Data.domains(aList);
			}
		});
	};

	AdminApp.prototype.reloadPluginList = function ()
	{
		Data.pluginsLoading(true);
		Remote.pluginList(function (sResult, oData) {

			Data.pluginsLoading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var aList = _.map(oData.Result, function (oItem) {
					return {
						'name': oItem['Name'],
						'disabled': ko.observable(!oItem['Enabled']),
						'configured': ko.observable(!!oItem['Configured'])
					};
				}, this);

				Data.plugins(aList);
			}
		});
	};

	AdminApp.prototype.reloadPackagesList = function ()
	{
		Data.packagesLoading(true);
		Data.packagesReal(true);

		Remote.packagesList(function (sResult, oData) {

			Data.packagesLoading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.packagesReal(!!oData.Result.Real);
				Data.packagesMainUpdatable(!!oData.Result.MainUpdatable);

				var
					aList = [],
					aLoading = {}
				;

				_.each(Data.packages(), function (oItem) {
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

				Data.packages(aList);
			}
			else
			{
				Data.packagesReal(false);
			}
		});
	};

	AdminApp.prototype.updateCoreData = function ()
	{
		Data.coreUpdating(true);
		Remote.updateCoreData(function (sResult, oData) {

			Data.coreUpdating(false);
			Data.coreRemoteVersion('');
			Data.coreRemoteRelease('');
			Data.coreVersionCompare(-2);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.coreReal(true);
				window.location.reload();
			}
			else
			{
				Data.coreReal(false);
			}
		});

	};

	AdminApp.prototype.reloadCoreData = function ()
	{
		Data.coreChecking(true);
		Data.coreReal(true);

		Remote.coreData(function (sResult, oData) {

			Data.coreChecking(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.coreReal(!!oData.Result.Real);
				Data.coreUpdatable(!!oData.Result.Updatable);
				Data.coreAccess(!!oData.Result.Access);
				Data.coreRemoteVersion(oData.Result.RemoteVersion || '');
				Data.coreRemoteRelease(oData.Result.RemoteRelease || '');
				Data.coreVersionCompare(Utils.pInt(oData.Result.VersionCompare));
			}
			else
			{
				Data.coreReal(false);
				Data.coreRemoteVersion('');
				Data.coreRemoteRelease('');
				Data.coreVersionCompare(-2);
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

		Data.licensingProcess(true);
		Data.licenseError('');

		Remote.licensing(function (sResult, oData) {
			Data.licensingProcess(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result && Utils.isNormal(oData.Result['Expired']))
			{
				Data.licenseValid(true);
				Data.licenseExpired(Utils.pInt(oData.Result['Expired']));
				Data.licenseError('');

				Data.licensing(true);
			}
			else
			{
				if (oData && oData.ErrorCode && -1 < Utils.inArray(Utils.pInt(oData.ErrorCode), [
					Enums.Notification.LicensingServerIsUnavailable,
					Enums.Notification.LicensingExpired
				]))
				{
					Data.licenseError(Utils.getNotification(Utils.pInt(oData.ErrorCode)));
					Data.licensing(true);
				}
				else
				{
					if (Enums.StorageResultType.Abort === sResult)
					{
						Data.licenseError(Utils.getNotification(Enums.Notification.LicensingServerIsUnavailable));
						Data.licensing(true);
					}
					else
					{
						Data.licensing(false);
					}
				}
			}
		}, bForce);
	};

	AdminApp.prototype.bootstart = function ()
	{
		AbstractApp.prototype.bootstart.call(this);

		Data.populateDataOnStart();

		kn.hideLoading();

		if (!AppSettings.settingsGet('AllowAdminPanel'))
		{
			kn.routeOff();
			kn.setHash(LinkBuilder.root(), true);
			kn.routeOff();

			_.defer(function () {
				window.location.href = '/';
			});
		}
		else
		{
			if (!!AppSettings.settingsGet('Auth'))
			{
				kn.startScreens([AdminSettingsScreen]);
			}
			else
			{
				kn.startScreens([AdminLoginScreen]);
			}
		}

		if (window.SimplePace)
		{
			window.SimplePace.set(100);
		}
	};

	module.exports = new AdminApp();

}(module, require));