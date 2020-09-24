import ko from 'ko';

class IdentityUserStore {
	constructor() {
		this.identities = ko.observableArray([]);
		this.identities.loading = ko.observable(false).extend({ throttle: 100 });

		this.getIDS = () => this.identities().map(item => (item ? item.id() : null)).filter(value => null !== value);
	}
}

export default new IdentityUserStore();
