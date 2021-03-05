import ko from 'ko';
import { $htmlCL, leftPanelDisabled } from 'Common/Globals';

export const ThemeStore = {
	themes: ko.observableArray(),
	userBackgroundName: ko.observable(''),
	userBackgroundHash: ko.observable(''),
	isMobile: ko.observable($htmlCL.contains('rl-mobile')),

	populate: function(){
		const Settings = rl.settings,
			themes = Settings.app('themes');

		this.themes(Array.isArray(themes) ? themes : []);
		this.theme(Settings.get('Theme'));
		if (!this.isMobile()) {
			this.userBackgroundName(Settings.get('UserBackgroundName'));
			this.userBackgroundHash(Settings.get('UserBackgroundHash'));
		}

		leftPanelDisabled(this.isMobile());
	}
};

ThemeStore.theme = ko.observable('').extend({ limitedList: ThemeStore.themes });

ThemeStore.isMobile.subscribe(value => $htmlCL.toggle('rl-mobile', value));
