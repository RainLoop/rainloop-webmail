import ko from 'ko';
import { isArray } from 'Common/Utils';
import * as Settings from 'Storage/Settings';

class ThemeStore {
	constructor() {
		this.themes = ko.observableArray([]);
		this.themeBackgroundName = ko.observable('');
		this.themeBackgroundHash = ko.observable('');

		this.theme = ko.observable('').extend({ limitedList: this.themes });
	}

	populate() {
		const themes = Settings.appSettingsGet('themes');

		this.themes(isArray(themes) ? themes : []);
		this.theme(Settings.settingsGet('Theme'));
		this.themeBackgroundName(Settings.settingsGet('UserBackgroundName'));
		this.themeBackgroundHash(Settings.settingsGet('UserBackgroundHash'));
	}
}

export default new ThemeStore();
