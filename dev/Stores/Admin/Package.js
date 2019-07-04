import ko from 'ko';

class PackageAdminStore {
	constructor() {
		this.packages = ko.observableArray([]);
		this.packages.loading = ko.observable(false).extend({ throttle: 100 });

		this.packagesReal = ko.observable(true);
		this.packagesMainUpdatable = ko.observable(true);
	}
}

export default new PackageAdminStore();
