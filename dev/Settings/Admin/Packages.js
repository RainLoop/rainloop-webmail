import ko from 'ko';

import { Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import { PackageAdminStore } from 'Stores/Admin/Package';
import Remote from 'Remote/Admin/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';
import { PluginPopupView } from 'View/Popup/Plugin';
import { SettingsGet } from 'Common/Globals';

export class PackagesAdminSettings {
	constructor() {
		this.packagesError = ko.observable('');

		this.packages = PackageAdminStore;

		this.packagesCurrent = ko.computed(() =>
			PackageAdminStore.filter(item => item && item.installed && !item.canBeUpdated)
		);
		this.packagesAvailableForUpdate = ko.computed(() =>
			PackageAdminStore.filter(item => item && item.installed && !!item.canBeUpdated)
		);
		this.packagesAvailableForInstallation = ko.computed(() =>
			PackageAdminStore.filter(item => item && !item.installed)
		);

		this.visibility = ko.computed(() => (PackageAdminStore.loading() ? 'visible' : 'hidden'));

		this.enabledPlugins = ko.observable(!!SettingsGet('EnabledPlugins'));
		this.enabledPlugins.subscribe(value =>
			Remote.saveAdminConfig(null, {
				EnabledPlugins: value ? 1 : 0
			})
		);
	}

	onShow() {
		this.packagesError('');
	}

	onBuild(oDom) {
		PackageAdminStore.fetch();

		oDom.addEventListener('click', event => {
			// configurePlugin
			let el = event.target.closestWithin('.package-configure', oDom),
				data = el ? ko.dataFor(el) : 0;
			data && Remote.plugin((iError, data) => iError || showScreenPopup(PluginPopupView, [data.Result]), data.name)
			// disablePlugin
			el = event.target.closestWithin('.package-active', oDom);
			data = el ? ko.dataFor(el) : 0;
			data && this.disablePlugin(data);
		});
	}

	requestHelper(packageToRequest, install) {
		return (iError, data) => {
			if (iError) {
				this.packagesError(
					getNotification(install ? Notification.CantInstallPackage : Notification.CantDeletePackage)
//					':\n' + getNotification(iError);
				);
			}

			PackageAdminStore.forEach(item => {
				if (item && packageToRequest && item.loading && item.loading() && packageToRequest.file === item.file) {
					packageToRequest.loading(false);
					item.loading(false);
				}
			});

			if (!iError && data.Result.Reload) {
				location.reload();
			} else {
				PackageAdminStore.fetch();
			}
		};
	}

	deletePackage(packageToDelete) {
		if (packageToDelete) {
			packageToDelete.loading(true);
			Remote.packageDelete(this.requestHelper(packageToDelete, false), packageToDelete);
		}
	}

	installPackage(packageToInstall) {
		if (packageToInstall) {
			packageToInstall.loading(true);
			Remote.packageInstall(this.requestHelper(packageToInstall, true), packageToInstall);
		}
	}

	disablePlugin(plugin) {
		let b = !plugin.enabled();
		plugin.enabled(b);
		Remote.pluginDisable((iError, data) => {
			if (iError) {
				this.packagesError(
					(Notification.UnsupportedPluginPackage === iError && data && data.ErrorMessage)
					? data.ErrorMessage
					: getNotification(iError)
				);
			}
//			PackageAdminStore.fetch();
		}, plugin.name, !b);
	}

}
