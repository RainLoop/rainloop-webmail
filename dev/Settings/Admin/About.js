import ko from 'ko';

class AboutAdminSettings {
	constructor() {
		this.version = ko.observable(rl.settings.app('version'));
		this.coreType = ko.observable('djmaze');
	}
}

export { AboutAdminSettings, AboutAdminSettings as default };
