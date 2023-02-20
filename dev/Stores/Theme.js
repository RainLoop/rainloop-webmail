import ko from 'ko';
import { $htmlCL, appEl, elementById, leftPanelDisabled, Settings, SettingsGet } from 'Common/Globals';
import { isArray, arrayLength } from 'Common/Utils';
import { cssLink, serverRequestRaw } from 'Common/Links';
import { SaveSettingStatus } from 'Common/Enums';

let __themeTimer = 0;

export const
	ThemeStore = {
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
	},

	changeTheme = (value, themeTrigger = ()=>0) => {
		const themeStyle = elementById('app-theme-style'),
			clearTimer = () => {
				__themeTimer = setTimeout(() => themeTrigger(SaveSettingStatus.Idle), 1000);
			},
			url = cssLink(value);

		if (themeStyle.dataset.name != value) {
			clearTimeout(__themeTimer);

			themeTrigger(SaveSettingStatus.Saving);

			rl.app.Remote.abort('theme').get('theme', url)
				.then(data => {
					if (2 === arrayLength(data)) {
						themeStyle.textContent = data[1];
						themeStyle.dataset.name = value;
						themeTrigger(SaveSettingStatus.Success);
					}
					clearTimer();
				}, clearTimer);
		}
	},

	convertThemeName = theme => theme.replace(/@[a-z]+$/, '').replace(/([A-Z])/g, ' $1').trim();

ThemeStore.isMobile.subscribe(value => $htmlCL.toggle('rl-mobile', value));

ThemeStore.fontSansSerif.subscribe(value => {
	if (null != value) {
		let cl = appEl.classList;
		cl.forEach(name => {
			if (name.startsWith('font') && !/font(Serif|Mono)/.test(name)) {
				cl.remove(name);
			}
		});
		value && cl.add('font'+value);
	}
});
ThemeStore.fontSerif.subscribe(value => {
	if (null != value) {
		let cl = appEl.classList;
		cl.forEach(name => name.startsWith('fontSerif') && cl.remove(name));
		value && cl.add('fontSerif'+value);
	}
});
ThemeStore.fontMono.subscribe(value => {
	if (null != value) {
		let cl = appEl.classList;
		cl.forEach(name => name.startsWith('fontMono') && cl.remove(name));
		value && cl.add('fontMono'+value);
	}
});

ThemeStore.userBackgroundHash.subscribe(value => {
	appEl.classList.toggle('UserBackground', !!value);
	appEl.style.backgroundImage = value ? "url("+serverRequestRaw('UserBackground', value)+")" : null;
});
