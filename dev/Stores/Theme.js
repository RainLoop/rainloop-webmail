import ko from 'ko';
import { isMobile } from 'Common/Globals';

export const ThemeStore = {
	themes: ko.observableArray(),
	themeBackgroundName: ko.observable(''),
	themeBackgroundHash: ko.observable(''),

	populate: function(){
		const Settings = rl.settings,
			themes = Settings.app('themes');

		this.themes(Array.isArray(themes) ? themes : []);
		this.theme(Settings.get('Theme'));
		if (!isMobile()) {
			this.themeBackgroundName(Settings.get('UserBackgroundName'));
			this.themeBackgroundHash(Settings.get('UserBackgroundHash'));
		}
	}
};

ThemeStore.theme = ko.observable('').extend({ limitedList: ThemeStore.themes });
