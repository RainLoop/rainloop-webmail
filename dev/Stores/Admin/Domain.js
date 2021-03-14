import ko from 'ko';
import Remote from 'Remote/Admin/Fetch';
import { StorageResultType } from 'Common/Enums';

export const DomainAdminStore = ko.observableArray();

DomainAdminStore.loading = ko.observable(false);

DomainAdminStore.fetch = () => {
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
};
