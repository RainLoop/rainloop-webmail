import ko from 'ko';
import Remote from 'Remote/Admin/Fetch';

export const DomainAdminStore = ko.observableArray();

DomainAdminStore.loading = ko.observable(false);

DomainAdminStore.fetch = () => {
	DomainAdminStore.loading(true);
	Remote.domainList((iError, data) => {
		DomainAdminStore.loading(false);
		if (!iError) {
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
};
