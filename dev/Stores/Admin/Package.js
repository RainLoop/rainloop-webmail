import ko from 'ko';

class PackageAdminStore {
	constructor() {
		this.packages = ko.observableArray();
		this.packages.loading = ko.observable(false).extend({ debounce: 100 });

		ko.addObservablesTo(this, {
			packagesReal: true,
			packagesMainUpdatable: true
		});
	}
}

export default new PackageAdminStore();
