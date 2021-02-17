import ko from 'ko';

export const PluginAdminStore = ko.observableArray();
PluginAdminStore.loading = ko.observable(false).extend({ debounce: 100 });
PluginAdminStore.error = ko.observable('');
