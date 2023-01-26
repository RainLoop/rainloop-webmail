import ko from 'ko';

import { Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import { PackageAdminStore } from 'Stores/Admin/Package';
import Remote from 'Remote/Admin/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';
import { PluginPopupView } from 'View/Popup/Plugin';
import { addObservablesTo, addComputablesTo } from 'External/ko';
import { AbstractViewSettings } from 'Knoin/AbstractViews';

export class AdminSettingsPackages extends AbstractViewSettings {
	constructor() {
		super();

		this.addSettings(['EnabledPlugins']);

		addObservablesTo(this, {
			packagesError: ''
		});

		this.packages = PackageAdminStore;

		addComputablesTo(this, {
			packagesCurrent: () => PackageAdminStore().filter(item => item?.installed && !item.canBeUpdated),
			packagesUpdate: () => PackageAdminStore().filter(item => item?.installed && item.canBeUpdated),
			packagesAvailable: () => PackageAdminStore().filter(item => !item?.installed),

			visibility: () => (PackageAdminStore.loading() ? 'visible' : 'hidden')
		});
	}

	onShow() {
		this.packagesError('');
	}

	onBuild(oDom) {
		PackageAdminStore.fetch();

		oDom.addEventListener('click', event => {
			// configurePlugin
			let el = event.target.closestWithin('.package-configure', oDom),
				data = el && ko.dataFor(el);
			data && Remote.request('AdminPluginLoad',
				(iError, data) => iError || showScreenPopup(PluginPopupView, [data.Result]),
				{
					id: data.id
				}
			);
			// disablePlugin
			el = event.target.closestWithin('.package-active', oDom);
			data = el && ko.dataFor(el);
			data && this.disablePlugin(data);
		});
	}

	requestHelper(packageToRequest, install) {
		return (iError, data) => {
			PackageAdminStore.forEach(item => {
				if (packageToRequest && item?.loading?.() && packageToRequest.file === item.file) {
					packageToRequest.loading(false);
					item.loading(false);
				}
			});

			if (iError) {
				this.packagesError(
					getNotification(install ? Notification.CantInstallPackage : Notification.CantDeletePackage)
					+ (data.ErrorMessage ? ':\n' + data.ErrorMessage : '')
				);
			} else if (data.Result.Reload) {
				location.reload();
			} else {
				PackageAdminStore.fetch();
			}
		};
	}

	deletePackage(packageToDelete) {
		if (packageToDelete) {
			packageToDelete.loading(true);
			Remote.request('AdminPackageDelete',
				this.requestHelper(packageToDelete, false),
				{
					id: packageToDelete.id
				}
			);
		}
	}

	installPackage(packageToInstall) {
		if (packageToInstall) {
			packageToInstall.loading(true);
			Remote.request('AdminPackageInstall',
				this.requestHelper(packageToInstall, true),
				{
					id: packageToInstall.id,
					type: packageToInstall.type,
					file: packageToInstall.file
				},
				60000
			);
		}
	}

	disablePlugin(plugin) {
		let disable = plugin.enabled();
		plugin.enabled(!disable);
		Remote.request('AdminPluginDisable',
			(iError, data) => {
				if (iError) {
					plugin.enabled(disable);
					this.packagesError(
						(Notification.UnsupportedPluginPackage === iError && data?.ErrorMessage)
						? data.ErrorMessage
						: getNotification(iError)
					);
				}
//				PackageAdminStore.fetch();
			}, {
				id: plugin.id,
				disabled: disable ? 1 : 0
			}
		);
	}

}
