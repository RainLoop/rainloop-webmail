import ko from 'ko';

import { Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import { PackageAdminStore } from 'Stores/Admin/Package';
import Remote from 'Remote/Admin/Fetch';

export class PackagesAdminSettings {
	constructor() {
		this.packagesError = ko.observable('');

		this.packages = PackageAdminStore;

		this.packagesCurrent = ko.computed(() =>
			PackageAdminStore.filter(item => item && item.installed && !item.compare)
		);
		this.packagesAvailableForUpdate = ko.computed(() =>
			PackageAdminStore.filter(item => item && item.installed && !!item.compare)
		);
		this.packagesAvailableForInstallation = ko.computed(() =>
			PackageAdminStore.filter(item => item && !item.installed)
		);

		this.visibility = ko.computed(() => (PackageAdminStore.loading() ? 'visible' : 'hidden'));
	}

	onShow() {
		this.packagesError('');
	}

	onBuild() {
		PackageAdminStore.fetch();
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
}
