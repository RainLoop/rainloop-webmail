import ko from 'ko';

import { appSettingsGet } from 'Storage/Settings';

class AboutAdminSettings {
	constructor() {
		this.version = ko.observable(appSettingsGet('version'));
		this.coreType = ko.observable('djmaze');
	}
}

export { AboutAdminSettings, AboutAdminSettings as default };
