import ko from 'ko';

class AppAdminStore {
	constructor() {
		this.weakPassword = ko.observable(false);

		this.dataFolderAccess = ko.observable(false);
	}

	populate() {
		this.weakPassword(!!rl.settings.get('WeakPassword'));
/*
		if (settingsGet('Auth')) {
			fetch('./data/VERSION?' + Math.random()).then(() => this.dataFolderAccess(true));
		}
*/
	}
}

export default new AppAdminStore();
