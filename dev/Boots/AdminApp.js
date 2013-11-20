/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends AbstractApp
 */
function AdminApp()
{
	AbstractApp.call(this);

	this.oData = null;
	this.oRemote = null;
	this.oCache = null;
}

_.extend(AdminApp.prototype, AbstractApp.prototype);

AdminApp.prototype.oData = null;
AdminApp.prototype.oRemote = null;
AdminApp.prototype.oCache = null;

/**
 * @return {AdminDataStorage}
 */
AdminApp.prototype.data = function ()
{
	if (null === this.oData)
	{
		this.oData = new AdminDataStorage();
	}

	return this.oData;
};

/**
 * @return {AdminAjaxRemoteStorage}
 */
AdminApp.prototype.remote = function ()
{
	if (null === this.oRemote)
	{
		this.oRemote = new AdminAjaxRemoteStorage();
	}

	return this.oRemote;
};

/**
 * @return {AdminCacheStorage}
 */
AdminApp.prototype.cache = function ()
{
	if (null === this.oCache)
	{
		this.oCache = new AdminCacheStorage();
	}

	return this.oCache;
};

AdminApp.prototype.reloadDomainList = function ()
{
	RL.data().domainsLoading(true);
	RL.remote().domainList(function (sResult, oData) {
		RL.data().domainsLoading(false);
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			var aList = _.map(oData.Result, function (bEnabled, sName) {
				return {
					'name': sName,
					'disabled': ko.observable(!bEnabled),
					'deleteAccess': ko.observable(false)
				};
			}, this);

			RL.data().domains(aList);
		}
	});
};

AdminApp.prototype.reloadPluginList = function ()
{
	RL.data().pluginsLoading(true);
	RL.remote().pluginList(function (sResult, oData) {
		RL.data().pluginsLoading(false);
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			var aList = _.map(oData.Result, function (oItem) {
				return {
					'name': oItem['Name'],
					'disabled': ko.observable(!oItem['Enabled']),
					'configured': ko.observable(!!oItem['Configured'])
				};
			}, this);

			RL.data().plugins(aList);
		}
	});
};

AdminApp.prototype.reloadPackagesList = function ()
{
	RL.data().packagesLoading(true);
	RL.data().packagesReal(true);
	
	RL.remote().packagesList(function (sResult, oData) {
		
		RL.data().packagesLoading(false);
		
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			RL.data().packagesReal(!!oData.Result.Real);
			RL.data().packagesMainUpdatable(!!oData.Result.MainUpdatable);
			
			var 
				aList = [],
				aLoading = {}
			;
			
			_.each(RL.data().packages(), function (oItem) {
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

			RL.data().packages(aList);
		}
		else
		{
			RL.data().packagesReal(false);
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

	RL.data().licensingProcess(true);
	RL.data().licenseError('');

	RL.remote().licensing(function (sResult, oData) {
		RL.data().licensingProcess(false);
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && Utils.isNormal(oData.Result['Expired']))
		{
			RL.data().licenseValid(true);
			RL.data().licenseExpired(Utils.pInt(oData.Result['Expired']));
			RL.data().licenseError('');
			
			RL.data().licensing(true);
		}
		else
		{
			if (oData && oData.ErrorCode && -1 < Utils.inArray(Utils.pInt(oData.ErrorCode), [
				Enums.Notification.LicensingServerIsUnavailable,
				Enums.Notification.LicensingExpired
			]))
			{
				RL.data().licenseError(Utils.getNotification(Utils.pInt(oData.ErrorCode)));
				RL.data().licensing(true);
			}
			else
			{
				if (Enums.StorageResultType.Abort === sResult)
				{
					RL.data().licenseError(Utils.getNotification(Enums.Notification.LicensingServerIsUnavailable));
					RL.data().licensing(true);
				}
				else
				{
					RL.data().licensing(false);
				}
			}
		}
	}, bForce);
};

AdminApp.prototype.bootstart = function ()
{
	AbstractApp.prototype.bootstart.call(this);

	RL.data().populateDataOnStart();

	kn.hideLoading();

	if (!RL.settingsGet('AllowAdminPanel'))
	{
		kn.routeOff();
		kn.setHash(RL.link().root(), true);
		kn.routeOff();

		_.defer(function () {
			window.location.href = '/';
		});
	}
	else
	{
		if (!!RL.settingsGet('Auth'))
		{
// TODO
//			if (!RL.settingsGet('AllowPackages') && AdminPackages)
//			{
//				Utils.disableSettingsViewModel(AdminPackages);
//			}

			kn.startScreens([AdminSettingsScreen]);

			if (!Globals.bMobileDevice)
			{
				_.defer(function () {
					Utils.initLayoutResizer('#rl-top-resizer-left', '#rl-top-resizer-right', '#rl-center',
						120, 300, 200, 600, Enums.ClientSideKeyName.FolderListSize);
				});
			}
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

/**
 * @type {AdminApp}
 */
RL = new AdminApp();
