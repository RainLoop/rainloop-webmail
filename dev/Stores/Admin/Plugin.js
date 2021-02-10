import ko from 'ko';

class PluginAdminStore {
	constructor() {
		this.plugins = ko.observableArray();
		this.plugins.loading = ko.observable(false).extend({ debounce: 100 });
		this.plugins.error = ko.observable('');
	}
}

export default new PluginAdminStore();
