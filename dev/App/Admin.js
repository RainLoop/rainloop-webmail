import 'External/Admin/ko';
import ko from 'ko';

import { StorageResultType } from 'Common/Enums';

import { AppAdminStore } from 'Stores/Admin/App';
import { CapaAdminStore } from 'Stores/Admin/Capa';
import { DomainAdminStore } from 'Stores/Admin/Domain';
import { PluginAdminStore } from 'Stores/Admin/Plugin';
import { PackageAdminStore } from 'Stores/Admin/Package';
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
		DomainAdminStore.loading(true);
		Remote.domainList((result, data) => {
			DomainAdminStore.loading(false);
			if (StorageResultType.Success === result && data && data.Result) {
				DomainAdminStore(
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
		PluginAdminStore.loading(true);
		Remote.pluginList((result, data) => {
			PluginAdminStore.loading(false);
			if (StorageResultType.Success === result && data && data.Result) {
				PluginAdminStore(
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
		PackageAdminStore.loading(true);
		Remote.packagesList((result, data) => {
			PackageAdminStore.loading(false);
			if (StorageResultType.Success === result && data && data.Result) {
				PackageAdminStore.real(!!data.Result.Real);

				let list = [];
				const loading = {};

				PackageAdminStore.forEach(item => {
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

				PackageAdminStore(list);
			} else {
				PackageAdminStore.real(false);
			}
		});
	}

	bootend() {
		progressJs.end();
	}

	bootstart() {
		super.bootstart();

		AppAdminStore.populate();
		CapaAdminStore.populate();

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
