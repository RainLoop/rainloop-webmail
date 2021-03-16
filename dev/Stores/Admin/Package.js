import ko from 'ko';
import Remote from 'Remote/Admin/Fetch';

export const PackageAdminStore = ko.observableArray();

PackageAdminStore.real = ko.observable(true);

PackageAdminStore.loading = ko.observable(false);

PackageAdminStore.fetch = () => {
	PackageAdminStore.loading(true);
	Remote.packagesList((iError, data) => {
		PackageAdminStore.loading(false);
		if (!iError && data && data.Result) {
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
};
