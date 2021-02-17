import ko from 'ko';

export const DomainAdminStore = ko.observableArray();

DomainAdminStore.loading = ko.observable(false).extend({ 'throttle': 100 });
