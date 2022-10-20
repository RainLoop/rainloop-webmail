import ko from 'ko';
import { doc, $htmlCL, elementById, leftPanelDisabled, Settings, SettingsGet } from 'Common/Globals';
import { isArray } from 'Common/Utils';
import { serverRequestRaw } from 'Common/Links';

export const ThemeStore = {
	theme: ko.observable(''),
	themes: ko.observableArray(),
	userBackgroundName: ko.observable(''),
	userBackgroundHash: ko.observable(''),
	fontSansSerif: ko.observable(''),
	fontSerif: ko.observable(''),
	fontMono: ko.observable(''),
	isMobile: ko.observable($htmlCL.contains('rl-mobile')),

	populate: () => {
		const themes = Settings.app('themes');

		ThemeStore.themes(isArray(themes) ? themes : []);
		ThemeStore.theme(SettingsGet('Theme'));
		if (!ThemeStore.isMobile()) {
			ThemeStore.userBackgroundName(SettingsGet('UserBackgroundName'));
			ThemeStore.userBackgroundHash(SettingsGet('UserBackgroundHash'));
		}
		ThemeStore.fontSansSerif(SettingsGet('fontSansSerif'));
		ThemeStore.fontSerif(SettingsGet('fontSerif'));
		ThemeStore.fontMono(SettingsGet('fontMono'));

		leftPanelDisabled(ThemeStore.isMobile());
	}
};

ThemeStore.isMobile.subscribe(value => $htmlCL.toggle('rl-mobile', value));

ThemeStore.fontSansSerif.subscribe(value => {
	if (null != value) {
		let cl = elementById('rl-app').classList;
		cl.forEach(name => {
			if ('font' === name.slice(0,4) && !/font(Serif|Mono)/.test(name)) {
				cl.remove(name);
			}
		});
		value && cl.add('font'+value);
	}
});
ThemeStore.fontSerif.subscribe(value => {
	if (null != value) {
		let cl = elementById('rl-app').classList;
		cl.forEach(name => {
			if ('fontSerif' === name.slice(0,9)) {
				cl.remove(name);
			}
		});
		value && cl.add('fontSerif'+value);
	}
});
ThemeStore.fontMono.subscribe(value => {
	if (null != value) {
		let cl = elementById('rl-app').classList;
		cl.forEach(name => {
			if ('fontMono' === name.slice(0,9)) {
				cl.remove(name);
			}
		});
		value && cl.add('fontMono'+value);
	}
});

ThemeStore.userBackgroundHash.subscribe(value => {
	if (value) {
		$htmlCL.add('UserBackground');
		doc.body.style.backgroundImage = "url("+serverRequestRaw('UserBackground', value)+")";
	} else {
		$htmlCL.remove('UserBackground');
		doc.body.removeAttribute('style');
	}
});
