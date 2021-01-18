import ko from 'ko';

class SieveUserStore {
	constructor() {
		// capabilities
		this.capa = ko.observableArray([]);
		// Sieve scripts SieveScriptModel
		this.scripts = ko.observableArray([]);
	}
}

export default new SieveUserStore();
