import _ from '_';
import ko from 'ko';

class DomainAdminStore {
	constructor() {
		this.domains = ko.observableArray([]);
		this.domains.loading = ko.observable(false).extend({ 'throttle': 100 });
		this.domainsWithoutAliases = ko.computed(() => _.filter(this.domains(), (item) => item && !item.alias));
	}
}

export default new DomainAdminStore();
