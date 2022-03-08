import ko from 'ko';
import { doc, $htmlCL, leftPanelDisabled, Settings, SettingsGet } from 'Common/Globals';
import { isArray } from 'Common/Utils';
import { serverRequestRaw } from 'Common/Links';

export const ThemeStore = {
	themes: ko.observableArray(),
	userBackgroundName: ko.observable(''),
	userBackgroundHash: ko.observable(''),
	isMobile: ko.observable($htmlCL.contains('rl-mobile')),

	populate: () => {
		const themes = Settings.app('themes');

		ThemeStore.themes(isArray(themes) ? themes : []);
		ThemeStore.theme(SettingsGet('Theme'));
		if (!ThemeStore.isMobile()) {
			ThemeStore.userBackgroundName(SettingsGet('UserBackgroundName'));
			ThemeStore.userBackgroundHash(SettingsGet('UserBackgroundHash'));
		}

		leftPanelDisabled(ThemeStore.isMobile());
	}
};

ThemeStore.theme = ko.observable('').extend({ limitedList: ThemeStore.themes });

ThemeStore.isMobile.subscribe(value => $htmlCL.toggle('rl-mobile', value));

ThemeStore.userBackgroundHash.subscribe(value => {
	if (value) {
		$htmlCL.add('UserBackground');
		doc.body.style.backgroundImage = "url("+serverRequestRaw('UserBackground', value)+")";
	} else {
		$htmlCL.remove('UserBackground');
		doc.body.removeAttribute('style');
	}
});
