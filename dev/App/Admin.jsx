
import {window, _} from 'common';
import ko from 'ko';
import progressJs from 'progressJs';

import * as Links from 'Common/Links';
import Translator from 'Common/Translator';
import {StorageResultType, Notification} from 'Common/Enums';
import {pInt, isNormal, isArray, inArray, isUnd} from 'Common/Utils';

import * as Settings from 'Storage/Settings';

import AppStore from 'Stores/Admin/App';
import DomainStore from 'Stores/Admin/Domain';
import PluginStore from 'Stores/Admin/Plugin';
import LicenseStore from 'Stores/Admin/License';
import PackageStore from 'Stores/Admin/Package';
import CoreStore from 'Stores/Admin/Core';
import Remote from 'Remote/Admin/Ajax';

import kn from 'Knoin/Knoin';

import {AbstractApp} from 'App/Abstract';

class AdminApp extends AbstractApp
{
	constructor()
	{
		super(Remote);
	}

	remote() {
		return Remote;
	}

	reloadDomainList() {
		DomainStore.domains.loading(true);
		Remote.domainList((result, data) => {
			DomainStore.domains.loading(false);
			if (StorageResultType.Success === result && data && data.Result)
			{
				DomainStore.domains(_.map(data.Result, ([enabled, alias], name) => {
					return {
						name: name,
						disabled: ko.observable(!enabled),
						alias: alias,
						deleteAccess: ko.observable(false)
					};
				}));
			}
		});
	}

	reloadPluginList() {
		PluginStore.plugins.loading(true);
		Remote.pluginList((result, data) => {
			PluginStore.plugins.loading(false);
			if (StorageResultType.Success === result && data && data.Result)
			{
				PluginStore.plugins(_.map(data.Result, (item) => {
					return {
						name: item.Name,
						disabled: ko.observable(!item.Enabled),
						configured: ko.observable(!!item.Configured)
					};
				}));
			}
		});
	}

	reloadPackagesList() {
		PackageStore.packages.loading(true);
		PackageStore.packagesReal(true);
		Remote.packagesList((result, data) => {
			PackageStore.packages.loading(false);
			if (StorageResultType.Success === result && data && data.Result)
			{
				PackageStore.packagesReal(!!data.Result.Real);
				PackageStore.packagesMainUpdatable(!!data.Result.MainUpdatable);

				let
					list = [],
					loading = {}
				;

				_.each(PackageStore.packages(), (item) => {
					if (item && item.loading())
					{
						loading[item.file] = item;
					}
				});

				if (isArray(data.Result.List))
				{
					list = _.compact(_.map(data.Result.List, (item) => {
						if (item)
						{
							item.loading = ko.observable(!isUnd(loading[item.file]));
							return 'core' === item.type && !item.canBeInstalled ? null : item;
						}
						return null;
					}));
				}

				PackageStore.packages(list);
			}
			else
			{
				PackageStore.packagesReal(false);
			}
		});
	}

	updateCoreData() {
		CoreStore.coreUpdating(true);
		Remote.updateCoreData((result, data) => {
			CoreStore.coreUpdating(false);
			CoreStore.coreVersion('');
			CoreStore.coreRemoteVersion('');
			CoreStore.coreRemoteRelease('');
			CoreStore.coreVersionCompare(-2);
			if (StorageResultType.Success === result && data && data.Result)
			{
				CoreStore.coreReal(true);
				window.location.reload();
			}
			else
			{
				CoreStore.coreReal(false);
			}
		});
	}

	reloadCoreData() {
		CoreStore.coreChecking(true);
		CoreStore.coreReal(true);
		Remote.coreData((result, data) => {
			CoreStore.coreChecking(false);
			if (StorageResultType.Success === result && data && data.Result)
			{
				CoreStore.coreReal(!!data.Result.Real);
				CoreStore.coreChannel(data.Result.Channel || 'stable');
				CoreStore.coreType(data.Result.Type || 'stable');
				CoreStore.coreUpdatable(!!data.Result.Updatable);
				CoreStore.coreAccess(!!data.Result.Access);
				CoreStore.coreWarning(!!data.Result.Warning);
				CoreStore.coreVersion(data.Result.Version || '');
				CoreStore.coreRemoteVersion(data.Result.RemoteVersion || '');
				CoreStore.coreRemoteRelease(data.Result.RemoteRelease || '');
				CoreStore.coreVersionCompare(pInt(data.Result.VersionCompare));
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
	}

	/**
	 * @param {boolean=} force = false
	 */
	reloadLicensing(force = false) {
		LicenseStore.licensingProcess(true);
		LicenseStore.licenseError('');
		Remote.licensing((result, data) => {
			LicenseStore.licensingProcess(false);
			if (StorageResultType.Success === result && data && data.Result && isNormal(data.Result.Expired))
			{
				LicenseStore.licenseValid(true);
				LicenseStore.licenseExpired(pInt(data.Result.Expired));
				LicenseStore.licenseError('');
				LicenseStore.licensing(true);
				AppStore.prem(true);
			}
			else
			{
				if (data && data.ErrorCode && -1 < inArray(pInt(data.ErrorCode), [
					Notification.LicensingServerIsUnavailable,
					Notification.LicensingExpired
				]))
				{
					LicenseStore.licenseError(Translator.getNotification(pInt(data.ErrorCode)));
					LicenseStore.licensing(true);
				}
				else
				{
					if (StorageResultType.Abort === result)
					{
						LicenseStore.licenseError(Translator.getNotification(Notification.LicensingServerIsUnavailable));
						LicenseStore.licensing(true);
					}
					else
					{
						LicenseStore.licensing(false);
					}
				}
			}
		}, force);
	}

	bootend(callback = null) {
		if (progressJs)
		{
			progressJs.end();
		}

		if (callback)
		{
			callback();
		}
	}

	bootstart() {

		super.bootstart();

		require('Stores/Admin/App').populate();
		require('Stores/Admin/Capa').populate();

		kn.hideLoading();

		if (!Settings.appSettingsGet('allowAdminPanel'))
		{
			kn.routeOff();
			kn.setHash(Links.root(), true);
			kn.routeOff();

			_.defer(() => {
				window.location.href = '/';
			});
		}
		else
		{
			if (Settings.settingsGet('Auth'))
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

		this.bootend();
	}
}

const App = new AdminApp();
export default App;
