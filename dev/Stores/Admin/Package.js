import ko from 'ko';

export const PackageAdminStore = ko.observableArray();

PackageAdminStore.real = ko.observable(true);

PackageAdminStore.loading = ko.observable(false).extend({ debounce: 100 });
