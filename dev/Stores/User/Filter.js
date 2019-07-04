import ko from 'ko';
import { Magics } from 'Common/Enums';

class FilterUserStore {
	constructor() {
		this.capa = ko.observable('');
		this.modules = ko.observable({});

		this.filters = ko.observableArray([]);

		this.filters.loading = ko.observable(false).extend({ throttle: Magics.Time200ms });
		this.filters.saving = ko.observable(false).extend({ throttle: Magics.Time200ms });

		this.raw = ko.observable('');
	}
}

export default new FilterUserStore();
