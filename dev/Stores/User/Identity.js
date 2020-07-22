import _ from '_';
import ko from 'ko';

class IdentityUserStore {
	constructor() {
		this.identities = ko.observableArray([]);
		this.identities.loading = ko.observable(false).extend({ throttle: 100 });

		this.identitiesIDS = ko.computed(() => _.compact(this.identities().map(item => (item ? item.id : null))));
	}
}

export default new IdentityUserStore();
