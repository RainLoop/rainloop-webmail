import ko from 'ko';

class DomainAdminStore {
	constructor() {
		this.domains = ko.observableArray();
		this.domains.loading = ko.observable(false).extend({ 'throttle': 100 });
		this.domainsWithoutAliases = ko.computed(() => this.domains.filter(item => item && !item.alias));
	}
}

export default new DomainAdminStore();
