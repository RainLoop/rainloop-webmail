import ko from 'ko';

class FilterUserStore {
	constructor() {
		this.capa = ko.observable('');
		this.modules = ko.observable({});

		this.filters = ko.observableArray([]);

		this.filters.loading = ko.observable(false).extend({ throttle: 200 });
		this.filters.saving = ko.observable(false).extend({ throttle: 200 });

		this.raw = ko.observable('');
	}
}

export default new FilterUserStore();
