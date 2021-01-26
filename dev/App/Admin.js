import 'External/Admin/ko';
import ko from 'ko';

import { StorageResultType } from 'Common/Enums';

import AppStore from 'Stores/Admin/App';
import CapaStore from 'Stores/Admin/Capa';
import DomainStore from 'Stores/Admin/Domain';
import PluginStore from 'Stores/Admin/Plugin';
import PackageStore from 'Stores/Admin/Package';
import Remote from 'Remote/Admin/Fetch';

import { SettingsAdminScreen } from 'Screen/Admin/Settings';
import { LoginAdminScreen } from 'Screen/Admin/Login';

import { startScreens } from 'Knoin/Knoin';
import { AbstractApp } from 'App/Abstract';

class AdminApp extends AbstractApp {
	constructor() {
		super(Remote);
	}

	remote() {
		return Remote;
	}

	reloadDomainList() {
		DomainStore.domains.loading(true);
		Remote.domainList((result, data) => {
			DomainStore.domains.loading(false);
			if (StorageResultType.Success === result && data && data.Result) {
				DomainStore.domains(
					Object.entries(data.Result).map(([name, [enabled, alias]]) => ({
						name: name,
						disabled: ko.observable(!enabled),
						alias: alias,
						deleteAccess: ko.observable(false)
					}))
				);
			}
		});
	}

	reloadPluginList() {
		PluginStore.plugins.loading(true);
		Remote.pluginList((result, data) => {
			PluginStore.plugins.loading(false);
			if (StorageResultType.Success === result && data && data.Result) {
				PluginStore.plugins(
					data.Result.map(item => ({
						name: item.Name,
						disabled: ko.observable(!item.Enabled),
						configured: ko.observable(!!item.Configured)
					}))
				);
			}
		});
	}

	reloadPackagesList() {
		PackageStore.packages.loading(true);
		PackageStore.packagesReal(true);
		Remote.packagesList((result, data) => {
			PackageStore.packages.loading(false);
			if (StorageResultType.Success === result && data && data.Result) {
				PackageStore.packagesReal(!!data.Result.Real);
				PackageStore.packagesMainUpdatable(!!data.Result.MainUpdatable);

				let list = [];
				const loading = {};

				PackageStore.packages.forEach(item => {
					if (item && item.loading()) {
						loading[item.file] = item;
					}
				});

				if (Array.isArray(data.Result.List)) {
					list = data.Result.List.map(item => {
						if (item) {
							item.loading = ko.observable(loading[item.file] !== undefined);
							return 'core' === item.type && !item.canBeInstalled ? null : item;
						}
						return null;
					}).filter(v => v);
				}

				PackageStore.packages(list);
			} else {
				PackageStore.packagesReal(false);
			}
		});
	}

	bootend() {
		progressJs.end();
	}

	bootstart() {
		super.bootstart();

		AppStore.populate();
		CapaStore.populate();

		this.hideLoading();

		if (!rl.settings.app('allowAdminPanel')) {
			rl.route.root();
			setTimeout(() => location.href = '/', 1);
		} else {
			if (rl.settings.get('Auth')) {
				startScreens([SettingsAdminScreen]);
			} else {
				startScreens([LoginAdminScreen]);
			}
		}

		this.bootend();
	}
}

export default new AdminApp();
