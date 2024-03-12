import ko from 'ko';
import Remote from 'Remote/Admin/Fetch';

export const DomainAdminStore = ko.observableArray();

DomainAdminStore.loading = ko.observable(false);

DomainAdminStore.fetch = () => {
	DomainAdminStore.loading(true);
	Remote.request('AdminDomainList',
		(iError, data) => {
			DomainAdminStore.loading(false);
			if (!iError) {
				DomainAdminStore(
					data.Result.map(item => {
						item.name = IDN.toUnicode(item.name);
						item.disabled = ko.observable(item.disabled);
						item.askDelete = ko.observable(false);
						return item;
					})
				);
			}
		}, {
			includeAliases: 1
		});
};
