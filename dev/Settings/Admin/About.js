import ko from 'ko';

class AboutAdminSettings {
	constructor() {
		this.version = ko.observable(rl.settings.app('version'));
	}
}

export { AboutAdminSettings, AboutAdminSettings as default };
