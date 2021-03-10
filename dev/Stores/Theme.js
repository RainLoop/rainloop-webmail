import ko from 'ko';
import { $htmlCL, leftPanelDisabled, Settings, SettingsGet } from 'Common/Globals';

export const ThemeStore = {
	themes: ko.observableArray(),
	userBackgroundName: ko.observable(''),
	userBackgroundHash: ko.observable(''),
	isMobile: ko.observable($htmlCL.contains('rl-mobile')),

	populate: function(){
		const themes = Settings.app('themes');

		this.themes(Array.isArray(themes) ? themes : []);
		this.theme(SettingsGet('Theme'));
		if (!this.isMobile()) {
			this.userBackgroundName(SettingsGet('UserBackgroundName'));
			this.userBackgroundHash(SettingsGet('UserBackgroundHash'));
		}

		leftPanelDisabled(this.isMobile());
	}
};

ThemeStore.theme = ko.observable('').extend({ limitedList: ThemeStore.themes });

ThemeStore.isMobile.subscribe(value => $htmlCL.toggle('rl-mobile', value));
