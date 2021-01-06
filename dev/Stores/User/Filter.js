import ko from 'ko';

class FilterUserStore {
	constructor() {
		ko.addObservablesTo(this, {
			capa: '',
			modules: [],
			raw: ''
		});

		this.filters = ko.observableArray([]);

		this.filters.loading = ko.observable(false).extend({ throttle: 200 });
		this.filters.saving = ko.observable(false).extend({ throttle: 200 });
	}
}

export default new FilterUserStore();
