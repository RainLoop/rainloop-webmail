import ko from 'ko';

export class AboutAdminSettings {
	constructor() {
		this.version = ko.observable(rl.settings.app('version'));
	}
}
