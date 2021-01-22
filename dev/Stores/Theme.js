import ko from 'ko';

class ThemeStore {
	constructor() {
		this.themes = ko.observableArray();
		this.themeBackgroundName = ko.observable('');
		this.themeBackgroundHash = ko.observable('');

		this.theme = ko.observable('').extend({ limitedList: this.themes });
	}

	populate() {
		const Settings = rl.settings,
			themes = Settings.app('themes');

		this.themes(Array.isArray(themes) ? themes : []);
		this.theme(Settings.get('Theme'));
		this.themeBackgroundName(Settings.get('UserBackgroundName'));
		this.themeBackgroundHash(Settings.get('UserBackgroundHash'));
	}
}

export default new ThemeStore();
